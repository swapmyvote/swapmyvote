require "rails_helper"

RSpec.describe "user_mailer/_social_media_im_using_links", type: :view do
  before do
    allow(OnsConstituency).to receive(:all).and_return([build(:wakefield), build(:tiverton)])
  end

  context "in a by-election" do
    specify "matches snapshot" do
      allow(view).to receive(:general_election?).and_return(false)

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("social_media_im_using_links_by_election")
    end
  end

  context "in a general election" do
    specify "matches snapshot" do
      allow(view).to receive(:general_election?).and_return(true)

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("social_media_im_using_links_general")
    end
  end
end
