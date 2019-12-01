FactoryBot.define do
  factory :ons_constituency do
    name { "Woking" }
    ons_id { "factory-faked-ons-id-#{name.downcase}"}
  end
end
