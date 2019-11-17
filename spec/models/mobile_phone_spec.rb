require "rails_helper"

RSpec.describe MobilePhone, type: :model do
  it "prevents two users having the same number" do
    phone1 = subject
    phone1.user = create(:user)
    number1 = "07771 111 111"
    number2 = "07772 222 222"
    phone1.number = number1
    phone1.save!
    user2 = create(:user)
    phone2 = create(:mobile_phone, number: number2, user: user2)
    user2.mobile_phone = phone2
    user2.save!
    expect {
      MobilePhone.create!(user: user2, number: number1)
    }.to raise_error(ActiveRecord::RecordInvalid,
                     /Number has already been taken/)
    # Check it has kept the old numbers
    phone1.user.reload
    expect(phone1.user.mobile_phone.number).to eq(number1)
    user2.reload
    expect(user2.mobile_phone.number).to eq(number2)
  end

  it "must validate with a user_id" do
    subject.user = User.new
    expect(subject).to be_valid
  end

  it "must not validate without a user_id" do
    expect(subject).to_not be_valid
    subject.valid?
    expect(subject.errors[:user]).to include("must exist")
  end
end
