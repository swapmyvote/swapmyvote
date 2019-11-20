FactoryBot.define do
  factory :user do
    name { "John Doe" }
    provider { "facebook" }
    uid { 11111111111111111 }
    image { "http://graph.facebook.com/v3.0/#{uid}/picture" }
  end
end
