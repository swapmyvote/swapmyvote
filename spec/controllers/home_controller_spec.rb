require "rails_helper"
require "support/user_sessions"
require "support/swaps_closed"

RSpec.describe HomeController, type: :controller do
  include Devise::Test::ControllerHelpers

  def test_renders_pre_login_page(params = {})
  # party = Party.find_by(name: "Liberal Democrats")
    party = create(:party, name: "Liberal Democrats")
    get :pre_login, params: params
    expect(subject).to render_template(:index)
    expect(assigns(:parties)).to all(be_a(Party))
    expect(assigns(:parties).count).to be >= 1
    return party
  end

  def test_renders_home_page(params = {})
    create(:ons_constituency, name: "Burkshire")
    get :index, params: params
    expect(subject).to render_template(:index)
    expect(assigns(:constituencies)).to all(be_a(OnsConstituency))
    expect(assigns(:constituencies).count).to be >= 1
  end

  context "home page: when not logged in" do
    it "renders home page when not logged in" do
      test_renders_home_page
    end

    it "parameter opensesame sets session[:sesame] open" do
      expect { test_renders_home_page(opensesame: "open") }
        .to change {session[:sesame] }.to("open")
    end

    it "parameter closesesame sets session[:sesame] closed" do
      session[:sesame] = "open"
      expect { test_renders_home_page(closesesame: nil) }
        .to change {session[:sesame] }.to(nil)
    end

    # it "prepopulates preferred party from session" do
    #   slug = "liberal_democrats"
    #   session["pre_populate"] = { "preferred_party_name" => slug }
    #   party = test_renders_home_page
    #   expect(assigns(:preferred_party_id)).to eq(party.id)
    # end

    # it "prepopulates willing party from session" do
    #   slug = "liberal_democrats"
    #   session["pre_populate"] = { "willing_party_name" => slug }
    #   party = test_renders_home_page
    #   expect(assigns(:willing_party_id)).to eq(party.id)
    # end

    it "doesn't prepopulate an unrecognised preferred party from session" do
      slug = "green"
      session["pre_populate"] = { "preferred_party_name" => slug }
      test_renders_home_page
      expect(assigns(:preferred_party_id)).to be_nil
    end

    it "doesn't prepopulate an unrecognised willing party from session" do
      slug = "green"
      session["pre_populate"] = { "willing_party_name" => slug }
      test_renders_home_page
      expect(assigns(:willing_party_id)).to be_nil
    end
  end

  context "pre_login page: when not logged in" do
    it "renders pre_login page when not logged in" do
      test_renders_pre_login_page
    end

    it "prepopulates preferred party from session" do
      slug = "liberal_democrats"
      session["pre_populate"] = { "preferred_party_name" => slug }
      party = test_renders_pre_login_page
      expect(assigns(:preferred_party_id)).to eq(party.id)
    end

    it "prepopulates willing party from session" do
      slug = "liberal_democrats"
      session["pre_populate"] = { "willing_party_name" => slug }
      party = test_renders_pre_login_page
      expect(assigns(:willing_party_id)).to eq(party.id)
    end

    it "doesn't prepopulate an unrecognised preferred party from session" do
      slug = "green"
      session["pre_populate"] = { "preferred_party_name" => slug }
      test_renders_pre_login_page
      expect(assigns(:preferred_party_id)).to be_nil
    end

    it "doesn't prepopulate an unrecognised willing party from session" do
      slug = "green"
      session["pre_populate"] = { "willing_party_name" => slug }
      test_renders_pre_login_page
      expect(assigns(:willing_party_id)).to be_nil
    end
  end

  context "home page: when logged in", logged_in: true do
    it "renders home page when swapping is closed", swapping: :closed do
      test_renders_home_page
    end

    it "redirects to user page when swapping is open" do
      get :index
      expect(subject).to redirect_to(:user)
    end

    it "redirects to user page when swapping is closed, but opensesame has been done",
       logged_in: true,
       swapping: :closed do
      session[:sesame] = "open"
      get :index
      expect(subject).to redirect_to(:user)
    end
  end
end
