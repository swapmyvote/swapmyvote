charts = []
window.drawPollChart = (args...) ->
  charts.push args

_drawCharts = () ->
  for chart in charts
    _drawPollChart(chart...)
  window.drawPollChart = _drawPollChart

google.load("visualization", "1", {packages:["corechart"]})
google.setOnLoadCallback(_drawCharts)

_drawPollChart = (selector, poll_data) ->
  data = google.visualization.arrayToDataTable([
    ['Party', 'Vote %', { role: "style" }]
  ].concat(poll_data))

  max = Math.max(poll_data.map((d) -> d[1]))

  options = {
    hAxis: { textPosition: 'none' },
    vAxis: {
      textPosition: 'none',
      gridlines: {
        color: 'transparent'
      },
      viewWindow: {
        min: 0, max: max
      }
    },
    legend: { position: "none" },
    bar: { groupWidth: '90%' },
    chartArea: {
      width: '60%',
      height: '80%'
    },
    height: 120,
    tooltip: {
      textStyle: {
        fontSize: 12,
        fontName: "Open Sans"
      }
    }
  }

  chart = new google.visualization.ColumnChart(document.getElementById(selector))

  chart.draw(data, options)
