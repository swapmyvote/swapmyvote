FactoryBot.define do
  factory :sent_email do
    user { nil }
    template { "MyString" }
  end
end
