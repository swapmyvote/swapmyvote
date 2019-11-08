# frozen_string_literal: true

module PollsHelper
  def poll_data_for(constituency)
    data = []
    constituency.polls.sort_by(&:votes).reverse.each do |poll|
      data.push [poll.party.name, poll.votes / 100, poll.party.color]
    end
    data.to_json.html_safe
  end
end
