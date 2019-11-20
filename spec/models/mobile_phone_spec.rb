require "rails_helper"

RSpec.describe MobilePhone, type: :model do
  it "prevents two users having the same number" do
    number = "07771 111 111"
    subject.user_id = User.create.id
    subject.number = number
    subject.save!
    expect(subject.id).not_to be_nil
    expect {
      MobilePhone.create!(number: number)
    }.to raise_error(ActiveRecord::RecordInvalid,
                     /Number has already been taken/)
  end
end
