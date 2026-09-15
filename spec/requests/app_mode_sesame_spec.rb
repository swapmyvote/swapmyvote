require "rails_helper"

# The `opensesame` lever used to live on HomeController alone, which meant a
# phase could only be set by visiting the legacy HAML home page. The React SPA
# is served by SpaController, and at cutover "/" becomes SpaController too — so
# the lever has to work from any path. See swapmyvote/swapmyvote#1079.
RSpec.describe "the opensesame phase lever", type: :request do
  it "sets the phase from a non-HomeController path" do
    get "/app/ping", params: { opensesame: "closed-warm-up" }
    expect(response).to have_http_status(:ok)

    get "/api/v1/session"
    expect(JSON.parse(response.body)["appMode"]).to eq("closed-warm-up")
  end

  it "clears the phase from a non-HomeController path" do
    get "/app/ping", params: { opensesame: "closed-warm-up" }
    get "/app/ping", params: { closesesame: "1" }

    get "/api/v1/session"
    expect(JSON.parse(response.body)["appMode"]).to eq("open")
  end

  it "still works on the legacy home page" do
    get "/", params: { opensesame: "closed-wind-down" }

    get "/api/v1/session"
    expect(JSON.parse(response.body)["appMode"]).to eq("closed-wind-down")
  end

  it "rejects a phase that is not a valid mode" do
    # AppModeConcern#app_mode validates lazily: writing an unknown mode to
    # session[:sesame] never raises by itself, only a request that actually
    # reads app_mode does. SpaController#index renders a bare shell and never
    # calls it, so setting the bad value here still answers 200 — the raise
    # only happens on the next request that reads the mode.
    get "/app/ping", params: { opensesame: "not-a-mode" }
    expect(response).to have_http_status(:ok)

    # The raise itself doesn't reach this spec as a Ruby exception: this
    # app's test.rb still sets config.action_dispatch.show_exceptions to the
    # legacy boolean `false`, left over from before Rails 7 replaced it with
    # the :all/:rescuable/:none enum. ActionDispatch::ExceptionWrapper#show?
    # only special-cases :none and :rescuable, so `false` falls through to
    # the "show it" branch and the exception is rendered as a response
    # instead of propagating — see ExceptionWrapper#show? and
    # ShowExceptions#call in actionpack. Assert on what genuinely happens
    # rather than on a raise this environment doesn't deliver.
    get "/api/v1/session"
    expect(response).to have_http_status(:internal_server_error)
    expect(response.body).to include("Invalid sesame")
  end
end
