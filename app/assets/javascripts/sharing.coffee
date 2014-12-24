# Place all the behaviors and hooks related to the matching controller here.
# All this logic will automatically be available in application.js.
# You can use CoffeeScript in this file: http://coffeescript.org/

window.shareOnFacebook = (app_id, url) ->
  share_url =  "https://www.facebook.com/sharer/sharer.php?app_id=#{app_id}"
  share_url += "&u=#{encodeURIComponent(url)}"
  share_url += "&sdk=joey&display=popup&ref=plugin"
  window.open(share_url, 'sharer', "toolbar=0,status=0,width=626,height=436")