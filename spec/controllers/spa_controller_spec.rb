require "rails_helper"

RSpec.describe SpaController, type: :controller do
  include Devise::Test::ControllerHelpers

  render_views

  describe "phase override" do
    it "parameter opensesame sets session[:sesame]" do
      expect { get :index, params: { opensesame: "open" } }
        .to change { session[:sesame] }.to("open")
    end

    it "parameter closesesame clears session[:sesame]" do
      session[:sesame] = "open"
      expect { get :index, params: { closesesame: nil } }
        .to change { session[:sesame] }.to(nil)
    end

    it "leaves session[:sesame] alone when neither param is given" do
      session[:sesame] = "open"
      expect { get :index }.not_to(change { session[:sesame] })
    end
  end

  describe "sharing metadata" do
    # The SPA layout has to carry the same social/SEO head as
    # application.html.haml, or the M9 cutover silently drops every link
    # preview and the favicon.
    def meta(attribute, value)
      Nokogiri::HTML(response.body)
        .at_css("meta[#{attribute}='#{value}']")
        &.attr("content")
    end

    before { get :index }

    it "renders the Open Graph tags" do
      expect(meta("property", "og:type")).to eq("website")
      expect(meta("property", "og:title")).to include("Swap My Vote")
      expect(meta("property", "og:image")).to include("facebook_sharing_banner")
      expect(meta("property", "og:url")).to eq("https://www.swapmyvote.uk")
      expect(meta("property", "og:site_name")).to eq("Swap My Vote")
    end

    it "renders the Twitter card tags" do
      expect(meta("name", "twitter:card")).to eq("summary_large_image")
      expect(meta("name", "twitter:site")).to eq("@SwapMyVote")
      expect(meta("name", "twitter:title")).to eq("Swap My Vote")
      expect(meta("name", "twitter:description")).to include("Make your vote count")
      expect(meta("name", "twitter:image")).to include("facebook_sharing_banner")
    end

    it "falls back to the site-wide description, having no per-page one" do
      expect(meta("property", "description")).to include("Make votes matter!")
      expect(meta("property", "og:description")).to include("Make votes matter!")
    end

    it "renders the favicons" do
      hrefs = Nokogiri::HTML(response.body)
        .css("link[rel='icon']")
        .map { |link| link.attr("href") }
      expect(hrefs.size).to eq(2)
      expect(hrefs.join).to include("favicon_16")
      expect(hrefs.join).to include("favicon_32")
    end
  end
end
