var tpv = {};

$(document).ready(function() {
  console.log('Document ready.');

  setUpUploader('networkInput', 'networkInputLabel', parseNetwork)
  setUpUploader('timeSeriesInput', 'timeSeriesInputLabel', parseTimeSeries)
  setUpUploader('actIntInput', 'actIntInputLabel', parseAllowedIntervals)
  setUpUploader('profileNodeMapInput', 'profileNodeMapInputLabel', parseMapping)

  $('#visButton').click(visualizeData);
})

function visualizeData() {
  tpv.networkVisualizer.loadNetwork(tpv.network);
  tpv.timeSeriesVisualizer.loadTimeSeries(tpv.timeSeries, tpv.profileNodeMap);
  setUpNodeSearch(tpv.network.vertices, tpv.networkVisualizer.zoomToNode)
}

function parseNetwork(d) {
  var rows = d3.tsv.parseRows(d);
  tpv.network = {};
  var vertices = new Set();
  var edges = new Set();
  rows.forEach(function (row) {
    var id1 = row[0];
    var id2 = row[2];
    var rel = row[1];
    vertices.add(id1);
    vertices.add(id2);
    edges.add(signedDirectedEdge(id1, id2, rel));
  });
  tpv.network = {
    vertices: Array.from(vertices),
    edges: Array.from(edges)
  };
  console.log("Done parsing network.")
}

function signedDirectedEdge(id1, id2, rel) {
  var reverseDir = id2 < id1;
  var leftId  = reverseDir ? id2 : id1;
  var rightId = reverseDir ? id1 : id2;
  var edge = {
    source: leftId,
    target: rightId,
    lra: false,
    lri: false,
    rla: false,
    rli: false,
  }

  if (rel == "U") {
    edge.lra = true;
    edge.lri = true;
    edge.rla = true;
    edge.rli = true;
  } else if (rel == "A") {
    if (reverseDir) {
      edge.rla = true;
    } else {
      edge.lra = true;
    }
  } else if (rel == "I") {
    if (reverseDir) {
      edge.rli = true;
    } else {
      edge.lri = true;
    }
  } else if (rel == "N") {
    if (reverseDir) {
      edge.rla = true;
      edge.rli = true;
    } else {
      edge.lra = true;
      edge.lri = true;
    }
  }
  return edge;
}

function parseTimeSeries(d) {
  var rows = d3.tsv.parseRows(d);
  var header = rows.shift();
  var firstHeader = header.shift();
  var labels = header;

  var profiles = [];
  rows.forEach(function (row) {
    var id = row.shift();
    var values = row.map(parseFloat);
    profiles.push({id: id, values: values});
  });
  tpv.timeSeries = {
    labels: labels,
    profiles: profiles
  };
  console.log("Parsed time series.");
}

function parseAllowedIntervals(d) {
  var rows = d3.tsv.parseRows(d);
  var header = rows.shift();

  tpv.allowedIntervals = {};
  rows.forEach(function (row) {
    var id = row.shift();
    var values = row;
    tpv.allowedIntervals[id] = values;
  });
  console.log("Parsed allowed intervals.")
}

function parseMapping(d) {
  // multiple mapped values are separated by a pipe character.
  var data = d3.tsv.parse(d);
  tpv.profileNodeMap = {};
  data.forEach(function (d) {
    var pep = d["peptide"];
    var prots = (d["protein(s)"]).split("|");
    tpv.profileNodeMap[pep] = prots;
  })

  console.log("Parsed name mapping.")
}

function setUpNodeSearch(nodeNames, callback) {
  // constructs the suggestion engine
  var nodeNames = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    local: $.map(nodeNames, function(state) { return { value: state }; })
  });

  // kicks off the loading/processing of `local` and `prefetch`
  nodeNames.initialize();
  $('#nodeSelector .typeahead').typeahead({
    hint: true,
    highlight: true,
    minLength: 1
  },
  {
    name: 'nodeNames',
    displayKey: 'value',
    source: nodeNames.ttAdapter()
  }).on('typeahead:autocompleted', function($e, datum){
    callback(datum.value);
  }).on('typeahead:selected', function($e, datum){
    callback(datum.value);
  });
}

function setUpUploader(inputId, labelId, callback) {
  $(document).on('change', '#' + inputId, function() {
    var reader = new FileReader();
    reader.onload = function(e) {
      var contents = e.target.result;
      callback(contents);
    };

    var input = $(this);
    var file = input.get(0).files[0];
    reader.readAsText(file);

    var label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
    $('#' + labelId).val(label);
  });

}
