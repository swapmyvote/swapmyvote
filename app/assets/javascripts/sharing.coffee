# Place all the behaviors and hooks related to the matching controller here.
# All this logic will automatically be available in application.js.
# You can use CoffeeScript in this file: http://coffeescript.org/

window.shareOnFacebook = (app_id, url, quote, hashtag) ->
  share_url =  "https://www.facebook.com/sharer/sharer.php?"
  share_url += "u=#{encodeURIComponent(url)}"
  share_url += "&display=popup"
  share_url += "&quote=#{encodeURIComponent(quote)}"
  share_url += "&hashtag=#{encodeURIComponent(hashtag)}"
  window.open(share_url, 'fb_sharer', "toolbar=0,status=0,width=626,height=436")

window.shareOnTwitter = (url, text) ->
  share_url =  "https://twitter.com/share"
  share_url += "?url=#{encodeURIComponent(url)}"
  share_url += "&related=SwapMyVote"
  share_url += "&text=#{encodeURIComponent(text)}"
  window.open(share_url, 'twitter_sharer', "toolbar=0,status=0,width=626,height=436")
