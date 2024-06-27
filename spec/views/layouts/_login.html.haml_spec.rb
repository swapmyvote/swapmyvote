require "rails_helper"

RSpec.describe "layouts/_login", type: :view do
  it "doesn't display login modal by default" do
    render
    expect(rendered).to have_css("div#js-login-modal",
                                 style: "display: none;",
                                 visible: :hidden)
  end

  it "displays a login modal if log_in_with param set" do
    %w[1 yes facebook twitter email any].each do |val|
      params[:log_in_with] = val
      render
      expect(rendered).to have_css("div#js-login-modal",
                                   style: "display: inherit;")
    end
  end

  context "with log_in_with=facebook" do
    before do
      params[:log_in_with] = "facebook"
    end

    it "login modal allows Facebook login" do
      render
      expect(rendered).to include "Log in or sign up with Facebook"
    end

    it "login modal doesn't allow Twitter login" do
      render
      expect(rendered).not_to include "Log in or sign up with Twitter"
    end

    it "login modal doesn't allow email login" do
      render
      expect(rendered).not_to include "Log in or sign up with email"
    end
  end

  context "with log_in_with=twitter" do
    before do
      params[:log_in_with] = "twitter"
    end

    it "login modal doesn't allow Facebook login" do
      render
      expect(rendered).not_to include "Log in or sign up with Facebook"
    end

    it "login modal allows Twitter login" do
      render
      expect(rendered).to include "Log in or sign up with Twitter"
    end

    it "login modal doesn't allow email login" do
      render
      expect(rendered).not_to include "Log in or sign up with email"
    end
  end

  context "with log_in_with=email" do
    before do
      params[:log_in_with] = "email"
    end

    it "login modal doesn't allow Facebook login" do
      render
      expect(rendered).not_to include "Log in or sign up with Facebook"
    end

    it "login modal doesn't allow Twitter login" do
      render
      expect(rendered).not_to include "Log in or sign up with Twitter"
    end

    it "login modal allows email login" do
      render
      expect(rendered).to include "Log in or sign up with email"
    end
  end
end
