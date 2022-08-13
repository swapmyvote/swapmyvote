FactoryBot.define do
  factory :ons_constituency do
    name { "Woking" }
    ons_id { "factory-faked-ons-id-#{name.downcase}"}
    factory :tiverton do
      name { "Tiverton and Honiton"}
      ons_id { "E14000996" }
    end
    factory :wakefield do
      name { "Wakefield"}
      ons_id { "E14001009" }
    end
  end
end
