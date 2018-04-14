var legend = d3.select('#legend').append('svg')
  .attr('width', 960)
  .attr('height', 44)
  .style('fill', 'none');

var svg = d3.select('body').append('svg')
  .attr('width', 960)
  .attr('height', 600)
  .style('fill', 'none');

var basemap = svg.append('g');
var content = svg.append('g');

var projection = d3.geo.albers();

var path = d3.geo.path()
    .projection(projection);

// Create diverging green-pink color scale centered on 0 minute delay
var delayBins = [-30, -15, 0, 15, 30, 60, 120];
var colors = ["#4d9221", "#a1d76a", "#f7f7f7", "#fde0ef", "#f1b6da", "#de77ae", "#c51b7d"];
var legendData = delayBins.map(function(d, i) {
	return {delay: d, color: colors[i]};
});
var scale = d3.scale.linear()
    .domain(delayBins)
    .range(colors);

// Create legend, with one box for each color defined above
legend.selectAll('rect')
    .data(legendData)
  .enter().append('rect')
    .attr('x', function(d, i) { return 375 + i * 30; })
    .attr('y', 6)
    .attr('width', 30)
    .attr('height', 18)
    .style('fill', function(d) { return d.color; });

// Annotate legend with delay values associated with each color
legend.selectAll('text')
    .data(legendData)
  .enter().append('text')
    .attr('x', function(d, i) { return 390 + i * 30; })
    .attr('y', 36)
    .attr('text-anchor', 'middle')
    .style('fill', '#ddd')
    .text(function(d) { return d.delay; });

// Create tooltip
var tooltip = d3.select('body').append('div')
                  .attr('class', 'tooltip')
                  .style('opacity', 0);

// Draw basemap
// TopoJSON from https://gist.githubusercontent.com/mbostock/4090846/raw/d534aba169207548a8a3d670c9c2cc719ff05c47/us.json
d3.json('us.json', function(error, us) {
  if (error) throw error;

  // Select just the outer border of the US
  var nation = topojson.mesh(us, us.objects.states, function(a, b) { return a === b; });
  // Select interior state boundaries
  var states = topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; });

  basemap.append('path')
      .datum(nation)
      .attr('class', 'nation')
      .attr('stroke-width', 0.5)
      .attr('d', path);

  basemap.append('path')
      .datum(states)
      .attr('class', 'state')
      .attr('stroke-width', 0.5)
      .attr('d', path);
});

// Load airport data and plot them on the map as points
d3.csv('airports.csv', function(data) {
  content.selectAll('.airport')
      .data(data)
    .enter().append('circle')
      .attr('class', 'airport')
      .attr('id', function(d) { return d.code; })
      .attr('long', function(d) { return d.longitude; })
      .attr('lat', function(d) { return d.latitude; })
      .attr('cx', function(d) { return projection([d.longitude, d.latitude])[0]; })
      .attr('cy', function(d) { return projection([d.longitude, d.latitude])[1]; })
      .attr('r', '2px')
      .on('mouseover', function(d) {
        tooltip.transition()
          .style('opacity', 0.9);
        tooltip.html('<b>' + d.code + '</b><br/>' + d.city + ', ' + d.state)
          .style('left', (d3.event.pageX) + 'px')
          .style('top', (d3.event.pageY - 42) + 'px');
      })
      .on('mousemove', function(d) {
        tooltip.style('left', (d3.event.pageX) + 'px')
          .style('top', (d3.event.pageY - 42) + 'px');
      })
      .on('mouseout', function(d) {
        tooltip.transition()
          .duration(200)
          .style('opacity', 0);
      });
  plotFlightpaths();
});

// Load on-time data and plot flight paths of one airplane
function plotFlightpaths(plane) {
  // Reset all airport styling
  content.selectAll('.airport-visible')
      .attr('class', 'airport')
      .attr('r', '2px');

  var url = 'random_plane.php';
  var carrier = d3.select('#carrier').node().value;
  if (carrier) url += '?carrier=' + carrier;

  d3.json(url, function(data) {
    var flightpaths = [];

    // Update plane info with the plane we'll be looking at
    var plane = data[0].tailNum;
    d3.select('#plane').node().textContent = plane;
    d3.select('#photos').node().href = 'https://www.jetphotos.com/registration/' + plane;
    d3.select('#history').node().href = 'https://flightaware.com/live/flight/' + plane;
    d3.select('#registration').node().href = 'http://registry.faa.gov/aircraftinquiry/NNum_Results.aspx?NNumbertxt=' + plane;

    // Sort in order of increasing date and time
    data.sort(function(a,b) {
          aDate = new Date(a.date);
          bDate = new Date(b.date);
          aTime = parseInt(a.depTime);
          bTime = parseInt(b.depTime);
          if (aDate.getTime() === bDate.getTime()) {
            return aTime - bTime;
          } else {
            return aDate - bDate;
          }
        })
        // Make visible each airport that our plane flies into and out of,
        // and add those airports' coordinates to the flightpaths
        .forEach(function(flight) {
          origin = content.select('#' + flight.origin);
          origin.attr('class', 'airport-visible');
          origin.attr('r', '4px');
          dest = content.select('#' + flight.dest);
          dest.attr('class', 'airport-visible');
          dest.attr('r', '4px');
          flightpaths.push({
            carrier: flight.carrier,
            number: flight.flightNum,
            origin: flight.origin,
            dest: flight.dest,
            delay: flight.arrDelay,
            path: {
              type: 'LineString',
              coordinates: [
                [ origin.attr('long'), origin.attr('lat') ],
                [ dest.attr('long'), dest.attr('lat') ]
              ]
            }
          });
    });

    // Bind new data to path elements
    var flightpath = content.selectAll('.flightpath')
        .data(flightpaths);

    // Remove unneeded paths
    flightpath.exit().remove();

    // Update remaining paths with new routes
    flightpath
        .attr('stroke-width', 10)
        .style('stroke', function(d) { return scale(d.delay); })
        .attr('d', function(d) { return path(d.path); })

    // Draw new paths if necessary
    flightpath.enter().append('path')
        .attr('class', 'flightpath')
        .attr('stroke-width', 10)
        .style('stroke', function(d) { return scale(d.delay); })
        .attr('d', function(d) { return path(d.path); })
        .on('mouseover', function(d) {
          tooltip.transition()
            .style('opacity', 0.9);
          tooltip.html('<b>' + d.carrier + ' ' + d.number + '</b><br/>' + d.origin + ' - ' + d.dest + '<br/> Delay: ' + d.delay)
            .style('left', (d3.event.pageX) + 'px')
            .style('top', (d3.event.pageY - 42) + 'px');
        })
        .on('mousemove', function(d) {
          tooltip.style('left', (d3.event.pageX) + 'px')
            .style('top', (d3.event.pageY - 42) + 'px');
        })
        .on('mouseout', function(d) {
          tooltip.transition()
            .duration(1000)
            .style('opacity', 0);
        });

    // Animate drawing of each flightpath
    flightpath
        .attr('stroke-dasharray', function() {
          var totalLength = this.getTotalLength();
          return totalLength + ' ' + totalLength;
        })
        .attr('stroke-dashoffset', function() {
          var totalLength = this.getTotalLength();
          return totalLength;
        })
        .transition()
          .duration(200)
          .delay(function(d, i) { return i * 200; })
          .ease('linear')
          .attr('stroke-dashoffset', 0)
        .transition()
          .attr('stroke-width', 2);

    // Make sure that newly-drawn flightpaths have not hidden airports
    reorder();
  });
}

// Move visited airports to front and unused airports to back
function reorder() {
  content.selectAll('path, .airport-visible').sort(function(d1, d2) {
    path1 = false;
    path2 = false;
    if (d1.carrier) { path1 = true; }
    if (d2.carrier) { path2 = true; }
    if (path1 === path2) {
      return 0;
    } else if (path1 === false) {
      return 1;
    } else {
      return -1;
    }
  });
  content.selectAll('path, .airport').sort(function(d1, d2) {
    path1 = false;
    path2 = false;
    if (d1.carrier) { path1 = true; }
    if (d2.carrier) { path2 = true; }
    if (path1 === path2) {
      return 0;
    } else if (path1 === false) {
      return -1;
    } else {
      return 1;
    }
  });
}
