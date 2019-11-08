# frozen_string_literal: true

class HomeController < ApplicationController
  def index
    if logged_in? && swapping_open?
      redirect_to user_path
      return
    end
    @parties = Party.all
    return if session["pre_populate"]

    @parties.each do |party|
      party_config(party)
    end
  end

  def party_config(party)
    if canonical_name(party.name) == canonical_name(session["pre_populate"]["preferred_party_name"])
      @preferred_party_id = party.id
    end

    return unless canonical_name(party.name) == canonical_name(session["pre_populate"]["willing_party_name"])

    @willing_party_id = party.id
  end
end
