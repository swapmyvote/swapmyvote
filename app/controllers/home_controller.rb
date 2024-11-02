class HomeController < ApplicationController
  include HomeHelper

  before_action :whats_the_magic_word

  def index
    if params.key?(:clear)
      session.delete("pre_populate")
      session.delete("pre_login_flow")
    end

    logger.warn "params.inspect: #{params.inspect}"
    logger.warn "session['pre_login_flow'].inspect: #{session["pre_login_flow"].inspect}"

    # Don't change this without also updating the related comment in
    # the view!
    if logged_in? && swapping_open?
      redirect_to user_path
      return
    end

    @parties = Party.all
    @constituencies = OnsConstituency.all.order(:name)
  end

  # rubocop:disable Metrics/MethodLength
  def pre_login
    logger.warn "params.inspect: #{params.inspect}"
    logger.warn "session['pre_login_flow'].inspect: #{session["pre_login_flow"].inspect}"

    if params["constituency_ons_id"]
      unless params["constituency_ons_id"].empty?

        logger.warn "params['constituency_ons_id']: #{params["constituency_ons_id"]}"

        @constituency_ons_id = params["constituency_ons_id"]
        mark_pre_login_constituency_complete
      end
    end

    if params["user"]
      if params["user"]["willing_party_id"] &&
        !params["user"]["willing_party_id"].empty?
        params["user"]["preferred_party_id"] &&
        !params["user"]["preferred_party_id"].empty?
        mark_pre_login_parties_complete
      end
    end

    if !pre_login_candidates_form_complete || !pre_login_candidates_form_complete
      # the view will figure out which form to render
      @parties = Party.all
      @constituencies = OnsConstituency.all.order(:name)

      prepopulate_fields_from_session

      render action: "index" and return
    end

    render action: "new", controller: "../users/sessions"
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
