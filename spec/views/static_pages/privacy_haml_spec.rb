require "rails_helper"

RSpec.describe "Privacy redirect", type: :request do
  it "redirects /privacy to the Forward Democracy privacy policy with a 301" do
    get "/privacy"
    expect(response).to have_http_status(:moved_permanently)
    expect(response).to redirect_to("https://forwarddemocracy.com/privacy-policy")
  end
end
