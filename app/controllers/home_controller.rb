class HomeController < ApplicationController
  before_action :whats_the_magic_word

  def index
    if params.key?(:clear) && prepops
      session.delete("pre_populate")
    end

    # Don't change this without also updating the related comment in
    # the view!
    if logged_in? && swapping_open?
      redirect_to user_path
      return
    end

    @parties = Party.all

    prepopulate_fields_from_session
  end

  private

  def prepopulate_fields_from_session
    return if prepops.nil?

    @parties.each do |party|
      if canonical_name(party.name) == prepopulated_party("preferred_party_name")
        @preferred_party_id = party.id
      end
      if canonical_name(party.name) == prepopulated_party("willing_party_name")
        @willing_party_id = party.id
      end
    end
  end

  def prepopulated_party(param)
    canonical_name(prepops[param])
  end

  def whats_the_magic_word
    if params.key?(:opensesame)
      session[:sesame] = params[:opensesame]
    elsif params.key?(:closesesame)
      session.delete :sesame
    end
  end
end
