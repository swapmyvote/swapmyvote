module Api
  module V1
    # The election the site is currently running for, as the SPA needs to talk
    # about it: "the 2024 general election", "Wakefield & Tiverton and Honiton
    # by-elections", "another constituency".
    #
    # Every value is derived in Ruby by ApplicationHelper, from ENV
    # (ELECTION_DATE, ELECTION_TYPE, ELECTION_INSTITUTION) and from how many
    # OnsConstituency rows exist. Re-deriving that in TypeScript would fork the
    # source of truth and drift the moment either input changed, so the strings
    # are computed server-side and sent whole.
    #
    # Unlike the session payload, this is immutable for the life of a deploy —
    # the SPA fetches it once and caches it indefinitely.
    class ElectionPresenter
      # Exposed name => the ApplicationHelper method behind it. Predicates are
      # renamed because `?` has no place in a JSON key.
      ATTRIBUTES = {
        general_election: :general_election?,
        hide_polls: :hide_polls?,
        year: :election_year,
        date: :election_date,
        season: :election_season,
        date_md: :election_date_md,
        date_dm: :election_date_dm,
        date_and_type_my: :election_date_and_type_my,
        date_and_type_mdy: :election_date_and_type_mdy,
        date_season_type: :election_date_season_type,
        event_title_with_year: :election_event_title_with_year,
        event_choice: :election_event_choice,
        hashtags: :election_hashtags,
        constituency_other: :election_constituency_other,
        constituencies_as_sentence: :by_election_constituencies_as_sentence
      }.freeze

      # @param context [Object] anything including ApplicationHelper — in
      #   practice the controller, since several of these read `session`.
      def initialize(context)
        @context = context
      end

      ATTRIBUTES.each do |exposed, helper_method|
        define_method(exposed) { @context.public_send(helper_method) }
      end

      def donate_link
        @context.donate_info[:link]
      end

      def donate_show
        @context.donate_info[:show]
      end
    end
  end
end
