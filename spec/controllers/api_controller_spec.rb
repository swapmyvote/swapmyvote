require "rails_helper"

RSpec.describe ApiController, type: :controller do
  def test_redirect
    get :pre_populate
    expect(response).to redirect_to(:root)
  end

  it "redirects to root_url with empty session" do
    test_redirect
  end

  it "redirects to root_url with preferred_party_name prepopulated" do
    session[:pre_populate] = { preferred_party_name: "green" }
    test_redirect
  end

  it "redirects to root_url with constituency_name prepopulated" do
    session[:pre_populate] = { constituency_name: "Islington North" }
    test_redirect
  end
end
