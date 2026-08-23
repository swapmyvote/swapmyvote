module Api
  module V1
    # See ElectionPresenter. Shape mirrored in app/frontend/types/api.ts.
    class ElectionSerializer
      include Alba::Resource

      transform_keys :lower_camel

      attributes :general_election, :hide_polls, :year, :season, :date_md,
                 :date_dm, :date_and_type_my, :date_and_type_mdy,
                 :date_season_type, :event_title_with_year, :event_choice,
                 :hashtags, :constituency_other, :constituencies_as_sentence

      # ISO 8601, so the client can format or compare it without parsing prose.
      attribute :date do |election|
        election.date.iso8601
      end

      # The crowdfunder call to action, shown only when DONATE_SHOW says so.
      nested :donate do
        attribute :link do |election|
          election.donate_link
        end

        attribute :show do |election|
          election.donate_show
        end
      end
    end
  end
end
