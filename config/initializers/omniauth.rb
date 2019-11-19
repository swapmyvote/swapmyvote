Rails.application.config.middleware.use OmniAuth::Builder do
  provider :facebook, ENV['FACEBOOK_KEY'], ENV['FACEBOOK_SECRET'],
           origin_param: 'return_to',
           client_options: {
             site: 'https://graph.facebook.com/v3.0',
             authorize_url: "https://www.facebook.com/v3.0/dialog/oauth"
           }
  provider :twitter, ENV['TWITTER_KEY'], ENV['TWITTER_SECRET'],
           origin_param: 'return_to'

  before_request_phase do |env|
    # Prior to login, save user parameters to session so that we can
    # retrieve them after authentication in order to update the user's
    # preferences.
    #
    # This API is basically undocumented and was figured from reading
    # omniauth's strategy.rb.
    env["rack.session"]["user_params"] = env["rack.request.form_hash"]["user"]
  end
end
