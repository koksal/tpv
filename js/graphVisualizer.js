(function() {
  var width   = $("#network").width(),
      height  = $("#network").height();

  var force = d3.layout.force()
      .size([width, height])
      .charge($("#chargeSlider").val())
      .linkDistance($("#linkDistSlider").val())

  var drag = force.drag()
      .on("dragend", dragend);

  var x = d3.scale.linear()
      .domain([0, width])
      .range([0, width]);

  var y = d3.scale.linear()
      .domain([0, height])
      .range([0, height]);

  var zoom = d3.behavior.zoom()
      .x(x)
      .y(y)
      .on("zoom", rescale);

  var svg = d3.select("#network").append("svg")
      .attr("width", width)
      .attr("height", height)
      .call(zoom);

  var svgG = svg.append("g");

  var link = svgG.selectAll(".link"),
      node = svgG.selectAll(".node"),
      text = svgG.selectAll(".nodelabel");

  var links = [],
      nodes = [];

  var radius = 12;
  var labelDist = 3;
  var canDragNodes = false;

  // cannot set css properties for svg markers, so they go here:
  var activatingColor = '#4DAF4A';
  var inhibitingColor = '#E41A1C';
  var ambigColor      = '#377EB8';

  $("#chargeSlider").change(function() {
    force.charge($(this).val());
    redraw();
  })

  $("#linkDistSlider").change(function() {
    force.linkDistance($(this).val());
    redraw();
  })

  $(window).resize(function () {
    width   = $("#network").width();
    height  = $("#network").height();

    force.size([width, height]);

    x.domain([0, width])
     .range([0, width]);

    y.domain([0, height])
     .range([0, height]);

    svg.attr("width", width)
       .attr("height", height);

    redraw();
  });

  function protIsSelected(id) {
    var n = nodeByName(id);
    var noneSelected = nodes.every(function (n) { return !n.selected; });
    var noneHovered = nodes.every(function (n) { return !n.hovered});
    return (noneSelected && noneHovered) || (n && n.selected);
  }

  function protIsHovered(id) {
    var n = nodeByName(id);
    return (n && n.hovered);
  }

  function clearNodeBrushing() {
    nodes.forEach(function (n) { n.brushed = false; });
  }

  function markNodeBrushing(id) {
    var n = nodeByName(id);
    if (n) {
      n.brushed = true;
    }
  }

  var color = d3.scale.linear()
                .domain([0, 1])
                .range(["white", "blue"]);

  // define arrow markers for graph links
  svgG.append('svg:defs').append('svg:marker')
      .attr('id', 'activating-end-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 6)
      .attr('markerWidth', 3)
      .attr('markerHeight', 3)
      .attr('orient', 'auto')
    .append('svg:path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', activatingColor);

  svgG.append('svg:defs').append('svg:marker')
      .attr('id', 'activating-start-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 4)
      .attr('markerWidth', 3)
      .attr('markerHeight', 3)
      .attr('orient', 'auto')
    .append('svg:path')
      .attr('d', 'M10,-5L0,0L10,5')
      .attr('fill', activatingColor);

  svgG.append('svg:defs').append('svg:marker')
      .attr('id', 'inhibiting-end-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 1)
      .attr('markerWidth', 3)
      .attr('markerHeight', 3)
      .attr('orient', 'auto')
    .append('svg:path')
      .attr('d', 'M0,-5L5,-5L5,5L0,5')
      .attr('fill', inhibitingColor);

  svgG.append('svg:defs').append('svg:marker')
      .attr('id', 'inhibiting-start-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 9)
      .attr('markerWidth', 3)
      .attr('markerHeight', 3)
      .attr('orient', 'auto')
    .append('svg:path')
      .attr('d', 'M10,-5L5,-5L5,5L10,5')
      .attr('fill', inhibitingColor);

  svgG.append('svg:defs').append('svg:marker')
      .attr('id', 'ambig-end-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 7)
      .attr('markerWidth', 3)
      .attr('markerHeight', 3)
      .attr('orient', 'auto')
    .append('svg:circle')
      .attr('cx', 5)
      .attr('cy', 0)
      .attr('r', 5)
      .attr('fill', ambigColor);

  svgG.append('svg:defs').append('svg:marker')
      .attr('id', 'ambig-start-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 2)
      .attr('markerWidth', 3)
      .attr('markerHeight', 3)
      .attr('orient', 'auto')
    .append('svg:circle')
      .attr('cx', 5)
      .attr('cy', 0)
      .attr('r', 5)
      .attr('fill', ambigColor);

  function redraw() {
    // nodes[0].fixed = true;
    // nodes[0].x = 0;
    // nodes[0].y = 0;

    force
        .nodes(nodes)
        .links(links)
        .start();

    // force.on("tick", function(e) {
    //   links.forEach(function(d, i) {
    //     d.target.y += (d.source.y + 80 - d.target.y);
    //   });
    // });

    for (var i = 0; i < 1000000; i++) force.tick();
    force.stop();

    link = link.data(links);
    link.enter().append("svg:path")
    link.exit().remove();

    node = node.data(nodes);
    node.enter().append("circle")
    node.exit().remove();

    text = text.data(nodes);
    text.enter()
        .append("svg:text")
    text.exit().remove();

    updateGraphCoordinates();
  }

  function drawNetwork() {
    var prizes = {};

    nodes.forEach(function (n) {
      n.prize = prizes[n.name] || 0;
    });

    link.call(processLink);
    node.call(processNode);
    text.call(processText)
  };

  function processLink(l) {
    l.attr("class", "link")
     .classed("ambig", ambiguousLink)
     .classed("nonambig", nonambigLink)
     .classed("inactive", inactiveLink)
     .classed("activating", activatingLink)
     .classed("inhibiting", inhibitingLink)
     .style('marker-start', startMarker)
     .style('marker-end', endMarker)
     .on("click", linkClicked)
     .on("mouseover", linkMouseOver)
     .on("mouseout", linkMouseOut);
  }

  function processNode(n) {
    n.attr("class", "node")
     .classed("selected", function (d) { return d.selected; })
     .classed("inactive", inactiveNode)
     .classed("brushed", brushedNode)
     .attr("r", radius)
     .attr("fill", function (d) { return color(d.prize); })
     .on("click", nodeClicked)
     .on("mouseover", nodeMouseOver)
     .on("mouseout", nodeMouseOut);

    if (canDragNodes) {
      n.call(drag);
    }
  }

  function processText(n) {
    n.attr("class", "nodelabel")
     .classed("inactive", inactiveNode)
     .attr("dx", radius + labelDist)
     .attr("dy", ".35em")
     .text(function(d) { return d.name });
  }

  function directedEdgePath(d) {
    var dx = d.target.x - d.source.x,
        dy = d.target.y - d.source.y,
        dist = Math.sqrt(dx * dx + dy * dy),
        normX = dx / dist,
        normY = dy / dist,
        sourcePadding = radius + 10,
        targetPadding = radius + 10,
        sourceX = d.source.x + sourcePadding * normX,
        sourceY = d.source.y + sourcePadding * normY,
        targetX = d.target.x - targetPadding * normX,
        targetY = d.target.y - targetPadding * normY;
    return 'M' + sourceX + ',' + sourceY + 'L' + targetX + "," + targetY;
  }

  function startMarker(l) {
    if (rlOnlyAct(l)) {
      return "url(#activating-start-arrow)";
    } else if (rlOnlyInh(l)) {
      return "url(#inhibiting-start-arrow)";
    } else if (rlActInh(l)) {
      return "url(#ambig-start-arrow)";
    } else {
      return "";
    }
  }

  function endMarker(l) {
    if (lrOnlyAct(l)) {
      return "url(#activating-end-arrow)";
    } else if (lrOnlyInh(l)) {
      return "url(#inhibiting-end-arrow)";
    } else if (lrActInh(l)) {
      return "url(#ambig-end-arrow)";
    } else {
      return "";
    }
  }

  function lrOnlyAct(l) {
    return l.lra && !l.lri;
  }

  function lrOnlyInh(l) {
    return l.lri && !l.lra;
  }

  function lrActInh(l) {
    return l.lra && l.lri;
  }

  function rlOnlyAct(l) {
    return l.rla && !l.rli;
  }

  function rlOnlyInh(l) {
    return l.rli && !l.rla;
  }

  function rlActInh(l) {
    return l.rla && l.rli;
  }

  function updateGraphCoordinates() {
    link.attr("d", directedEdgePath);

    node.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });

    text.attr("x", function(d) { return d.x; })
        .attr("y", function(d) { return d.y; });
  }

  function nodeClicked(n) {
    n.selected = !n.selected;
    d3.select(this).classed("selected", n.selected);
    tpv.timeSeriesVisualizer.highlightProfiles();
  }

  function nodeMouseOver(n) {
    n.hovered = true;
    d3.select(this).classed("hovered", true);
    tpv.timeSeriesVisualizer.highlightProfiles();
  }

  function nodeMouseOut(n) {
    n.hovered = false;
    d3.select(this).classed("hovered", false);
    tpv.timeSeriesVisualizer.highlightProfiles();
  }

  function linkClicked(l) { }

  function linkMouseOver(l) { }

  function linkMouseOut(l) { }

  // Note: to use if anchor positions are eventually needed
  function dragend(d) {
    // d.fixed = !d.fixed;
    // d3.select(this).classed("fixed", d.fixed);
  }

  function sourceTargetPair(l) {
    return {source: l.source.name, target: l.target.name};
  }

  function ambiguousLink(l) {
    var values = [l.lra, l.lri, l.rla, l.rli];
    var res = false;
    for (var i = 0; i < 3; i = i + 1) {
      for (var j = i + 1; j < 4; j = j + 1) {
        if (values[i] && values[j]) {
          res = true;
        }
      }
    }
    return res;
  }

  function nonambigLink(l) {
    return !ambiguousLink(l);
  }

  function activatingLink(l) {
    return l.lra || l.rla;
  }

  function inhibitingLink(l) {
    return l.lri || l.rli;
  }

  function inactiveLink(l) {
    return !linkInSolution(l) // || (inactiveNode(l.source) || inactiveNode(l.target));
  }

  function linkInSolution(l) {
    return l.lra || 
           l.lri || 
           l.rla || 
           l.rli;
  }

  function inactiveNode(n) {
    return !nodeInSolution(n) // || (!n.brushed && !tpv.timeSeriesVisualizer.noneBrushed());
  }

  function brushedNode(n) {
    return n.brushed && !tpv.timeSeriesVisualizer.noneBrushed();
  }

  function nodeInSolution(n) {
    var incidentLinks = links.filter(function (l) {
      return l.source == n || l.target == n;
    });
    var noIncidentLinkInSol = incidentLinks.every(function (l) {
      return !linkInSolution(l);
    });
    return !noIncidentLinkInSol;
  }

  function nodeByName(name) {
    var f = nodes.filter(function (n) { return n.name === name; });
    return f[0];
  }

  function linkByName(ls, source, target) {
    var f = ls.filter(function(l) { return l.source === source && l.target === target; });
    return f[0];
  }

  function rescale() {
    trans=d3.event.translate;
    scale=d3.event.scale;

    svgG.attr("transform",
        "translate(" + trans + ")"
        + " scale(" + scale + ")");
  }

  function zoomToNode(name) {
    var node = nodeByName(name);
    zoomToCoord(node.x, node.y);
  }

  function zoomToCoord(nx, ny) {
    var k = 4
    zoom.scale(k);
    var trans = zoom.translate();
    var shiftX = width / 2;
    var shiftY = height / 2;
    var newTrans = [trans[0] - x(nx) + shiftX, trans[1] - y(ny) + shiftY];
    svgG.transition().duration(750).call(zoom.translate(newTrans).event);
  }

  function createNodes(vertices) {
    nodes = [];
    vertices.forEach(function (d) {
      nodes.push({name: d});
    });
  }

  function createLinks(edges) {
    links = [];
    edges.forEach(function (l) {
      var source = nodeByName(l.source);
      var target = nodeByName(l.target);
      links.push({
        source: source, 
        target: target,
        lra: l.lra,
        lri: l.lri,
        rla: l.rla,
        rli: l.rli
      });
    });
  }

  function loadNetwork(network) {
    createNodes(network.vertices);
    createLinks(network.edges);
    redraw();
    drawNetwork();
  }

  tpv.networkVisualizer = {
    loadNetwork: loadNetwork,
    drawNetwork: drawNetwork,
    protIsSelected: protIsSelected,
    protIsHovered: protIsHovered,
    clearNodeBrushing: clearNodeBrushing,
    markNodeBrushing: markNodeBrushing,
    zoomToNode: zoomToNode
  }
})();
