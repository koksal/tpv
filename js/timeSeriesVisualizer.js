var loadTimeSeries,
    timeSeriesResponse,
    profileNodeMap,
    highlightProfiles,
    noneBrushed;

(function () {
  var divWidth   = $("#timeSeries").width(),
      divHeight  = $("#timeSeries").height();

  var margin = {top: 40, right: 30, bottom: 20, left: 50}

  var width = divWidth - margin.left - margin.right,
      height = divHeight - margin.top - margin.bottom;

  var x,
      y = {};

  var line = d3.svg.line(),
      axis = d3.svg.axis().orient("left"),
      foreground;


  var labels;

  loadTimeSeries = function() {
    var ts = timeSeriesResponse[networkQueryKey()];

    d3.select("#timeSeries svg").remove();

    var svg = d3.select("#timeSeries").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("svg:g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    labels = ts.profiles.labels;
    profiles = ts.profiles.profiles;
    profileNodeMap = ts.profileNodeMap;

    x = d3.scale.ordinal().domain(labels).rangePoints([0, width]);

    var min = d3.min(profiles, function (p) { return d3.min(p.values)});
    var max = d3.max(profiles, function (p) { return d3.max(p.values)});
    var extent = [min, max];

    labels.forEach(function (d) {
      y[d] = d3.scale.linear()
          .domain(extent)
          .range([height, 0]);

      y[d].brush = d3.svg.brush()
          .y(y[d])
          .on("brush", profilesBrushed);
    });

    // compute first activation interval, -1 if none
    profiles.forEach(function (p) {
      var firstActivityItvl = -1
      for (var i = 0; i < p.act.length; i++) {
        if (p.act[i] || p.inh[i]) {
          // only update once
          if (firstActivityItvl == -1) {
            firstActivityItvl = i;
          }
        }
      }
      p.firstActive = firstActivityItvl;
    })

    // Add foreground lines.
    foreground = svg.append("svg:g")
        .attr("class", "foreground")
      .selectAll("path")
        .data(profiles)
      .enter().append("svg:g")
        .call(profilePath)
        .on("mouseover", profileMouseOver)
        .on("mouseout", profileMouseOut)
        .on("mousemove", profileMouseMove);
    
    function profileMouseOver(p) {
      d3.select(this).classed("hovered", function (p) {
        var fd = d3.select(this).classed("faded");
        if (!fd) {
          focus.style("display", null);
        }
        return !fd;
      });
    }

    function profileMouseOut(p) {
      d3.select(this).classed("hovered", false);
      focus.style("display", "none");
    }

    function profileMouseMove(p) {
      focus.attr("transform", "translate(" + d3.mouse(this)[0] + "," + d3.mouse(this)[1] + ")");
      focus.select("text").text(profileNodeMap[p.id]);
    }

    var focus = svg.append("g")
      .attr("class", "focus")
      .style("display", "none");

    focus.append("text")
      .attr("x", 9)
      .attr("dy", ".35em");

    // Add a group element for each label.
    var g = svg.selectAll(".label")
        .data(labels)
      .enter().append("svg:g")
        .attr("class", "label")
        .attr("transform", function(d) { return "translate(" + x(d) + ")"; });

    // Add an axis and title.
    g.append("svg:g")
        .attr("class", "axis")
        .each(function(d) { d3.select(this).call(axis.scale(y[d])); })
      .append("svg:text")
        .attr("text-anchor", "middle")
        .attr("y", -9)
        .text(String);

    // Add a brush for each axis.
    g.append("svg:g")
        .attr("class", "brush")
        .each(function(d) { d3.select(this).call(y[d].brush); })
      .selectAll("rect")
        .attr("x", -8)
        .attr("width", 16);

    highlightProfiles();
  };

  function profilesBrushed() {
    highlightProfiles();
  }

  noneBrushed = function() {
    var noTimeSeriesBrushed = activeLabels().length == 0;
    return noTimeSeriesBrushed;
  }

  function activeLabels() {
    return labels.filter(function(l) { return !y[l].brush.empty(); });
  }

  highlightProfiles = function () {
    var actives = activeLabels(),
        extents = actives.map(function(l) { return y[l].brush.extent();});

    // node brushing will be updated
    clearNodeBrushing();

    foreground.classed("faded", function(d) {
      var brushed = actives.every(function (p, i) {
        var value = d.values[labels.indexOf(p)];
        return extents[i][0] <= value && value <= extents[i][1];
      });
      var prots = profileNodeMap[d.id];

      // brush corresponding nodes in graph
      if (brushed) {
        prots.forEach(function (p) {
          markNodeBrushing(p)
        })
      }

      var selected = !prots.every(function (prot) {
        return !protIsSelected(prot);
      });
      var hovered = !prots.every(function (prot) {
        return !protIsHovered(prot);
      });
      return !(brushed && (selected || hovered));
    });
    updateNetwork();
  }

  function profilePath(d) {
    d.selectAll("segment")
      .data(function (d, i) { return segments(d); })
    .enter().append("svg:path")
      .attr("d", segmentPath)
      .attr("class", segmentClass);
  }

  function segmentClass(p) {
    if (p.a && p.i) {
      return "both";
    } else if (p.a) {
      return "active";
    } else if (p.i) {
      return "inhibited";
    } else {
      return "neutral";
    }
  }

  function segmentPath(p) {
    return line([[p.x1, p.y1], [p.x2, p.y2]]);  
  }

  function segments(p) {
    return p.values.slice(1).map(function (d, i) {
      var x1 = x(labels[i]),
          x2 = x(labels[i+1]),
          y1 = y[labels[i]](p.values[i]),
          y2 = y[labels[i+1]](p.values[i+1]);
      return {x1: x1, x2: x2, y1: y1, y2: y2, a: p.act[i], i: p.inh[i]};
    })
  }
  
})();
