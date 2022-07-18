FactoryBot.define do
  factory :swap do
    factory :swap_with_two_users do
      choosing_user { association :ready_to_swap_user1, outgoing_swap: instance }
      chosen_user { association :ready_to_swap_user2, incoming_swap: instance }
    end
  end
end
