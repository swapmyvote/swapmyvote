require "rails_helper"

RSpec.describe ApplicationController, type: :controller do
  describe "#default_ons_constituency" do
    let(:ons_constituency) { build(:ons_constituency) }

    it "returns nil when no constituency in session" do
      expect(subject.default_ons_constituency).to be_nil
    end

    it "returns constituency when valid name in session" do
      session["pre_populate"] = {
        "constituency_name" => ons_constituency.name
      }
      allow(OnsConstituency).to receive(:find_by)
                                  .with(name: ons_constituency.name)
                                  .and_return(ons_constituency)
      expect(subject.default_ons_constituency).to eq ons_constituency
    end

    it "returns constituency when valid ONS id in session" do
      session["pre_populate"] = {
        "constituency_ons_id" => ons_constituency.ons_id
      }
      allow(OnsConstituency).to receive(:find_by)
                                  .with(ons_id: ons_constituency.ons_id)
                                  .and_return(ons_constituency)
      expect(subject.default_ons_constituency).to eq ons_constituency
    end

    it "returns constituency when invalid name and valid ONS id in session" do
      session["pre_populate"] = {
        "constituency_name" => "no such constituency",
        "constituency_ons_id" => ons_constituency.ons_id
      }
      allow(OnsConstituency).to receive(:find_by)
                                  .with(ons_id: ons_constituency.ons_id)
                                  .and_return(ons_constituency)
      expect(subject.default_ons_constituency).to eq ons_constituency
    end

    it "returns constituency when valid name and invalid ONS id in session" do
      session["pre_populate"] = {
        "constituency_name" => ons_constituency.name,
        "constituency_ons_id" => "invalid ONS id"
      }
      allow(OnsConstituency).to receive(:find_by)
                                  .with(ons_id: "invalid ONS id")
                                  .and_return(nil)
      allow(OnsConstituency).to receive(:find_by)
                                  .with(name: ons_constituency.name)
                                  .and_return(ons_constituency)
      expect(subject.default_ons_constituency).to eq ons_constituency
    end
  end
end
