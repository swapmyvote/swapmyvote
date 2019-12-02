FactoryBot.define do
  factory :identity do
    user { user }
    provider { :facebook }
    uid { 11111111111111111 }
    image_url { "http://graph.facebook.com/v3.0/#{uid}/picture" }
  end
end
