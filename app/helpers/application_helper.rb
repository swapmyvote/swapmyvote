module ApplicationHelper
  include ::AppModeConcern

  def sign_in_path
    "/users/sign_in"
  end

  def sign_up_path
    "/users/sign_up"
  end

  # def current_user   # for greppability
  # Note: current_user is provided by devise/controllers/helpers.rb

  def logged_in?
    return !current_user.nil?
  end

  def display_login_modal
    return params[:log_in_with] ? "inherit" : "none"
  end

  def canonical_name(name)
    return nil if name.nil?
    return name.parameterize(separator: "_").gsub(/\_party$/, "")
  end

  def github_url
    return "https://github.com/swapmyvote/swapmyvote/"
  end

  def mobile_verified?
    return current_user&.mobile_phone&.verified
  end

  def mobile_set_but_not_verified?
    return current_user&.mobile_phone &&
           !current_user.mobile_phone.verified
  end

  # Helpers for deciding which login methods to display in the login
  # modal dialog.  It's useful to restrict this to a particular
  # authentication type when leading an existing user back to login
  # from an email or SMS, to ensure they log in with the same identity
  # provider they used previously.  If params[:log_in_with] is
  # specified then the login modal dialog will be shown automatically.
  # Valid values are:
  #
  #   - "any" - all login methods are shown
  #   - "facebook" or "twitter - only that login method is shown
  #
  # If params[:log_in_with] is not specified then all login methods
  # will be shown but the dialog is not shown automatically.

  def log_in_with_facebook?
    return false if %w[all facebook].include? ENV["DISABLE_LOG_INS"]
    return true unless params[:log_in_with]
    return %w[any facebook].include? params[:log_in_with]
  end

  def log_in_with_twitter?
    return false if %w[all twitter].include? ENV["DISABLE_LOG_INS"]
    return true unless params[:log_in_with]
    return %w[any twitter].include? params[:log_in_with]
  end

  def log_in_with_email?
    return true unless params[:log_in_with]
    return %w[any email].include? params[:log_in_with]
  end

  def log_in_method_unrestricted?
    return false if ENV["DISABLE_LOG_INS"]
    return !params[:log_in_with] || params[:log_in_with] == "any"
  end

  def log_in_methods
    methods = []
    methods << "Facebook" if log_in_with_facebook?
    methods << "Twitter" if log_in_with_twitter?
    methods.join(" or ")
  end

  def donate_info
    return @donate_info if defined?(@donate_info)
    link = ENV["DONATE_LINK"] || "https://crowdfunder.co.uk/swapmyvote"
    show = !ENV["DONATE_SHOW"].nil? && ENV["DONATE_SHOW"][0] != "n" && ENV["DONATE_SHOW"][0] != "f"
    @donate_info = { link: link, show: show }
  end

  def by_election_constituencies
    OnsConstituency.all.map(&:name)
  end

  def by_election_constituencies_ampersand
    by_election_constituencies.map do |name|
      name.gsub(" and ", " & ")
    end
  end

  def by_election_constituencies_as_sentence
    # "Wakefield and Tiverton & Honiton"
    by_election_constituencies_ampersand.to_sentence
  end

  def election_event_title_with_year
    if general_election?
      "General Election #{election_year}"
    else
      "#{by_election_constituencies_as_sentence} #{election_year} by-elections"
    end
  end

  def election_event_choice
    if general_election?
      "General Election"
    else
      # "Wakefield or Tiverton & Honiton by-elections"
      options = { words_connector: ", ", last_word_connector: " or ", two_words_connector: " or " }
      "#{by_election_constituencies_ampersand.to_sentence(options)} by-elections"
    end
  end

  def election_hashtags
    if general_election?
      "#GeneralElection"
    else
      # "#Wakefield or #TivertonandHoniton #byelection"
      hashtags = by_election_constituencies.map do |name|
        "#" + name.gsub(/[^A-Za-z]/, "")
      end
      options = { words_connector: ", ", last_word_connector: " or ", two_words_connector: " or " }
      "#{hashtags.to_sentence(options)} #byelection"
    end
  end

  def election_date
    date_from_env = ENV["ELECTION_DATE"]
    return Date.parse(date_from_env) unless date_from_env.nil? || (date_from_env == "")
    Date.parse("2022-6-23")
  end

  def election_date_and_type_mdy
    # "June 23rd 2022 by-elections"
    day = election_date.day.ordinalize
    date_formatted = election_date.strftime("%B #{day} %Y")
    if general_election?
      date_formatted + " general election"
    else
      date_formatted + " by-elections"
    end
  end

  def election_date_and_type_my
    # "June 2022 by-elections"
    date_formatted = election_date.strftime("%B %Y")
    if general_election?
      date_formatted + " general election"
    else
      date_formatted + " by-elections"
    end
  end

  def election_date_season_type
    # "2022 summer by-elections"
    if general_election?
      "#{election_year} general election"
    else
      "#{election_year} #{election_season} by-elections"
    end
  end

  def election_year
    election_date.year.to_s
  end

  def election_season
    case election_date.month
    when 1..2 then :winter
    when 3..5 then :spring
    when 6..8 then :summer
    when 9..11 then :autumn
    when 12 then :winter
    end
  end

  def election_date_md
    # "June 23rd"
    day = election_date.day.ordinalize
    election_date.strftime("%B #{day}")
  end

  def election_date_dm
    # "23rd June"
    day = election_date.day.ordinalize
    election_date.strftime("#{day} %B")
  end

  def choice_of_swap_constituencies?
    OnsConstituency.count > 2
  end

  def election_constituency_other
    if general_election? || choice_of_swap_constituencies?
      "another constituency"
    else
      "the other constituency"
    end
  end

  def election_type_override
    election_type = ENV["ELECTION_TYPE"]
    return nil unless !election_type.nil? && election_type.size.positive?
    return :general if election_type[0].downcase == "g"
    return :by if election_type[0].downcase == "b"
    return nil
  end

  def general_election?
    !election_type_override.nil? ?
      (election_type_override == :general) :
      (OnsConstituency.count > OnsConstituency::NUMBER_OF_UK_CONSTITUENCIES / 2)
  end

  def app_taglines
    [
      "I am using Swap My Vote to make my vote count in the " +
      election_hashtags +
      "\\n\\n" +
      "#SwapMyVote",

      "Use Swap My Vote to make your vote count in the " +
      election_hashtags +
      "\\n\\n" +
      "#SwapMyVote",
    ]
  end

  def app_tagline
    app_taglines.sample
  end

  def hide_polls?
    return @hide_polls if defined?(@hide_polls)
    @hide_polls = OnsConstituency.count == 2
  end
end
