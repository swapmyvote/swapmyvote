FactoryBot.define do
  factory :user do
    name { "John" }
    email { "#{name.gsub(/\s/,".").downcase}@example.com" }
  end
end
