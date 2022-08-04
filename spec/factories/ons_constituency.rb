FactoryBot.define do
  factory :ons_constituency do
    name { "Woking" }
    ons_id { "factory-faked-ons-id-#{name.downcase}"}
    factory :tiverton do
      name { "Tiverton and Honiton"}
    end
    factory :wakefield do
      name { "Wakefield"}
    end
  end
end
