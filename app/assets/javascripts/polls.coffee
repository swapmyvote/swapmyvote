charts = []
window.drawPollChart = (args...) ->
  charts.push args

_drawCharts = () ->
  for chart in charts
    _drawPollChart(chart...)
  window.drawPollChart = _drawPollChart

google.charts.load('1', {packages: ['corechart']})
google.setOnLoadCallback(_drawCharts)


_drawPollChart = (selector, poll_data) ->
  formatMS = new google.visualization.NumberFormat({
    suffix: '%',
    fractionDigits: 0
  });

  rows = poll_data.map((row) -> [row[0], row[1], row[2], row[1] + '%']);
  data = google.visualization.arrayToDataTable([
    ['Party', 'Vote', { role: "style" }, { role: "annotation" }]
  ].concat(rows))
  formatMS.format(data, 1)

  max = Math.max.apply(null, poll_data.map((d) -> d[1]))

  options = {
    hAxis: { textPosition: 'none' },
    vAxis: {
      textPosition: 'none',
      gridlines: {
        color: 'transparent'
      },
      viewWindow: {
        min: 0, max: max
      },
      baselineColor: 'none',
    },
    legend: { position: "none" },
    bar: { groupWidth: '90%' },
    chartArea: {
      width: '90%',
      height: '90%'
    },
    height: 120,
    tooltip: {
      textStyle: {
        fontSize: 12,
        fontFamily: "Open Sans"
      }
    }
  }

  chart = new google.visualization.ColumnChart(document.getElementById(selector))

  chart.draw(data, options)
