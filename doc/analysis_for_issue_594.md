# Analysis for issue 594

## Timeline, recent first

### commit d954bd57d9ea7e88e4e0b5d25da8c863dcf6fa72 (issue-337-retrospective-email-consent)

Author: baob <coder@onesandthrees.com>
Date:   Wed Dec 11 13:06:15 2019 +0000

    deal with redundant method introduced by rebase

appears to delete swap_email_consent? which has different definition to my_email_consent?

Final state: my_email_consent and email_consent have the same definition AND SAME PURPOSE

### commit 8bb716f1e30b393b7271a95d1ded15a7d482b281

Author: baob <coder@onesandthrees.com>
Date:   Wed Dec 11 01:01:07 2019 +0000

    method my_email_consent? (#337)

adds def my_email_consent? - # Check if I have given permission for swapper to see my email
*appears to serve same purpose as adams added email_consent?*

Final state: my_email_consent and email_consent have the same definition, swap_my_email_consent differs

### commit 18e733ec9bdeaed6a7e845da0d907f35f1921319

Author: baob <coder@onesandthrees.com>
Date:   Tue Dec 10 19:19:25 2019 +0000

    detect update without confirm to make tests pass (#337)

adds def swap_email_consent? - Check if our swapper has given permission for us to see their email
*added by rebase on top of steve baxters work*

Final state: my_email_consent and swap_my_email_consent exist, content differs

### commit 68a54f1db35f16b60a9603bfe8d4e73d8a9cfbcb

Author: Adam Spiers <git@adamspiers.org>
Date:   Wed Dec 11 02:11:37 2019 +0400

    Fix text regarding how to reach out to swap partner

renames swap_email_consent? to email_consent?

deletes def swap_email_consent? - Check if our swapper has given permission for us to see their email
add +  def email_consent? - Check if user has given permission for swap partner to see their email

Final state: only email_consent exist

### commit 4f74f02f94f50baa750983f4f254f091550d071c (origin/issue-324-share-email-address, issue-324-share-email-address)

Author: Steve Baxter <steve@kuamka.com>
Date:   Tue Dec 10 17:21:13 2019 +0000

    Change swap_confirmed page so it shows any combination of email and social link. Added separate email_url get get an email link, profile_url will no longer return the email link.

adds +  def swap_email_consent? - Check if our swapper has given permission for us to see their email

Final state: only swap_consent exist
