FactoryBot.define do
  factory :sent_email do
    user { user }
    template { "MyString" }
  end
end
