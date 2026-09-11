ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "checklistEvidenceUrl" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "checklistNotes" TEXT;

WITH source("code", "phase", "stage", "title", "ownerRole") AS (VALUES
  ('MI-01','Identity','Immediately after Product approval','Confirm final Product name, spelling, logo/icon and target market','MARKETING_ASSISTANT'),
  ('MI-02','Identity','Immediately after Product approval','Define the standard username/handle to use across channels','MARKETING_ASSISTANT'),
  ('MI-03','Identity','Immediately after Product approval','Prepare short bio, Product description and official contact details','MARKETING_ASSISTANT'),
  ('MI-04','Ownership','Immediately after identity is frozen','Create the primary company-controlled Google account for the Product','MARKETING_ASSISTANT'),
  ('MI-05','Ownership','Same day as Google account','Enable security/2FA and record recovery and Admin ownership','MARKETING_ASSISTANT'),
  ('MI-06','Domain & Web','Early development','Purchase or claim the Product domain','MARKETING_ASSISTANT'),
  ('MI-07','Domain & Web','After domain purchase','Create a basic official landing page or Product website','WEB_MARKETING'),
  ('MI-08','Domain & Web','After website is accessible','Create and verify the Google Search Console property','MARKETING_ASSISTANT'),
  ('MI-09','Domain & Web','After website is accessible','Set up analytics and tracking for the website','MARKETING_ASSISTANT'),
  ('MI-10','Domain & Web','When sitemap is available','Submit the sitemap in Search Console','MARKETING_ASSISTANT'),
  ('MI-11','Social Channels','As soon as Product name is frozen','Create or secure the YouTube channel','MARKETING_ASSISTANT'),
  ('MI-12','Social Channels','As soon as Product name is frozen','Create or secure the Facebook Page','MARKETING_ASSISTANT'),
  ('MI-13','Social Channels','As soon as Product name is frozen','Create or secure the TikTok account','MARKETING_ASSISTANT'),
  ('MI-14','Social Channels','As soon as Product name is frozen','Create or secure the Instagram account','MARKETING_ASSISTANT'),
  ('MI-15','Social Channels','If relevant or requested','Secure optional channels: Threads, X, Discord, WhatsApp Channel and Reddit','MARKETING_ASSISTANT'),
  ('MI-16','Profile Setup','Immediately after channel creation','Upload logo/profile image and cover/banner where supported','MARKETING_ASSISTANT'),
  ('MI-17','Profile Setup','Immediately after channel creation','Add official bio, website, contact and correct category','MARKETING_ASSISTANT'),
  ('MI-18','Profile Setup','Immediately after channel creation','Use a consistent Product name and handle across profiles','MARKETING_ASSISTANT'),
  ('MI-19','Profile Setup','Immediately after channel creation','Connect Facebook and Instagram in the Meta business structure','MARKETING_ASSISTANT'),
  ('MI-20','Profile Setup','Before publishing','Add a company/Admin backup account to all critical platforms','MARKETING_ASSISTANT'),
  ('MI-21','Digital Web','After social profiles are complete','Add official social profile links to the Product website','MARKETING_ASSISTANT'),
  ('MI-22','Digital Web','When store listing exists','Add Play Store/App Store links to the website and social profiles','MARKETING_ASSISTANT'),
  ('MI-23','Digital Web','Before buzz begins','Test every public link from mobile and desktop','MARKETING_ASSISTANT'),
  ('MI-24','Content Bank','T-21 to T-14','Prepare the initial 5-10 launch creatives or videos','MARKETING_TEAM'),
  ('MI-25','Content Bank','T-21 to T-14','Prepare teaser and curiosity content','MARKETING_TEAM'),
  ('MI-26','Content Bank','T-14 to T-7','Prepare Product, gameplay or feature reveal content','MARKETING_TEAM'),
  ('MI-27','Content Bank','T-7 to T-1','Prepare countdown, launch-date and launch CTA content','MARKETING_TEAM'),
  ('MI-28','Content Bank','Before buzz begins','Prepare the posting schedule for Facebook, TikTok and YouTube','MARKETING_ASSISTANT'),
  ('MI-29','Seed Channels','T-14 or earlier','Publish the first introduction or teaser post on each primary channel','MARKETING_ASSISTANT'),
  ('MI-30','Seed Channels','T-14 to T-7','Publish the initial teaser and curiosity wave','MARKETING_ASSISTANT'),
  ('MI-31','Seed Channels','T-7 to T-1','Publish the reveal, gameplay and countdown wave','MARKETING_ASSISTANT'),
  ('MI-32','Launch','Launch Day','Publish the launch/download post across primary channels','MARKETING_ASSISTANT'),
  ('MI-33','Launch','Launch Day to D+7','Publish gameplay highlights, reactions, reviews and milestones','MARKETING_ASSISTANT'),
  ('MI-34','Launch','D+1 onward','Identify the strongest organic creative for paid promotion','MARKETING_LEAD'),
  ('MI-35','Verification','Before initial buzz','Verify the Infrastructure Ready gate','PROJECT_MANAGER'),
  ('MI-36','Verification','Before initial buzz','Verify the Channels Ready gate','PROJECT_MANAGER'),
  ('MI-37','Verification','Before initial buzz','Verify the Content Bank Ready gate','PROJECT_MANAGER'),
  ('MI-38','Verification','Before launch','Verify the Initial Buzz Ready gate and complete sign-off','PROJECT_MANAGER')
)
UPDATE "ChecklistTemplateItem" AS item
SET "phase" = source."phase", "stage" = source."stage", "title" = source."title",
    "description" = 'Timing: ' || source."stage" || '. Update the checklist status and attach a public evidence link or note when applicable.',
    "doneWhen" = source."title" || '; evidence or an operational note is recorded where applicable.',
    "ownerRole" = source."ownerRole", "mandatory" = source."code" <> 'MI-15',
    "templateVersion" = '2', "sourceConfirmed" = TRUE
FROM source WHERE item."code" = source."code";

WITH source("code", "phase", "stage", "title", "ownerRole") AS (VALUES
  ('MI-01','Identity','Immediately after Product approval','Confirm final Product name, spelling, logo/icon and target market','MARKETING_ASSISTANT'), ('MI-02','Identity','Immediately after Product approval','Define the standard username/handle to use across channels','MARKETING_ASSISTANT'), ('MI-03','Identity','Immediately after Product approval','Prepare short bio, Product description and official contact details','MARKETING_ASSISTANT'), ('MI-04','Ownership','Immediately after identity is frozen','Create the primary company-controlled Google account for the Product','MARKETING_ASSISTANT'), ('MI-05','Ownership','Same day as Google account','Enable security/2FA and record recovery and Admin ownership','MARKETING_ASSISTANT'), ('MI-06','Domain & Web','Early development','Purchase or claim the Product domain','MARKETING_ASSISTANT'), ('MI-07','Domain & Web','After domain purchase','Create a basic official landing page or Product website','WEB_MARKETING'), ('MI-08','Domain & Web','After website is accessible','Create and verify the Google Search Console property','MARKETING_ASSISTANT'), ('MI-09','Domain & Web','After website is accessible','Set up analytics and tracking for the website','MARKETING_ASSISTANT'), ('MI-10','Domain & Web','When sitemap is available','Submit the sitemap in Search Console','MARKETING_ASSISTANT'), ('MI-11','Social Channels','As soon as Product name is frozen','Create or secure the YouTube channel','MARKETING_ASSISTANT'), ('MI-12','Social Channels','As soon as Product name is frozen','Create or secure the Facebook Page','MARKETING_ASSISTANT'), ('MI-13','Social Channels','As soon as Product name is frozen','Create or secure the TikTok account','MARKETING_ASSISTANT'), ('MI-14','Social Channels','As soon as Product name is frozen','Create or secure the Instagram account','MARKETING_ASSISTANT'), ('MI-15','Social Channels','If relevant or requested','Secure optional channels: Threads, X, Discord, WhatsApp Channel and Reddit','MARKETING_ASSISTANT'), ('MI-16','Profile Setup','Immediately after channel creation','Upload logo/profile image and cover/banner where supported','MARKETING_ASSISTANT'), ('MI-17','Profile Setup','Immediately after channel creation','Add official bio, website, contact and correct category','MARKETING_ASSISTANT'), ('MI-18','Profile Setup','Immediately after channel creation','Use a consistent Product name and handle across profiles','MARKETING_ASSISTANT'), ('MI-19','Profile Setup','Immediately after channel creation','Connect Facebook and Instagram in the Meta business structure','MARKETING_ASSISTANT'), ('MI-20','Profile Setup','Before publishing','Add a company/Admin backup account to all critical platforms','MARKETING_ASSISTANT'), ('MI-21','Digital Web','After social profiles are complete','Add official social profile links to the Product website','MARKETING_ASSISTANT'), ('MI-22','Digital Web','When store listing exists','Add Play Store/App Store links to the website and social profiles','MARKETING_ASSISTANT'), ('MI-23','Digital Web','Before buzz begins','Test every public link from mobile and desktop','MARKETING_ASSISTANT'), ('MI-24','Content Bank','T-21 to T-14','Prepare the initial 5-10 launch creatives or videos','MARKETING_TEAM'), ('MI-25','Content Bank','T-21 to T-14','Prepare teaser and curiosity content','MARKETING_TEAM'), ('MI-26','Content Bank','T-14 to T-7','Prepare Product, gameplay or feature reveal content','MARKETING_TEAM'), ('MI-27','Content Bank','T-7 to T-1','Prepare countdown, launch-date and launch CTA content','MARKETING_TEAM'), ('MI-28','Content Bank','Before buzz begins','Prepare the posting schedule for Facebook, TikTok and YouTube','MARKETING_ASSISTANT'), ('MI-29','Seed Channels','T-14 or earlier','Publish the first introduction or teaser post on each primary channel','MARKETING_ASSISTANT'), ('MI-30','Seed Channels','T-14 to T-7','Publish the initial teaser and curiosity wave','MARKETING_ASSISTANT'), ('MI-31','Seed Channels','T-7 to T-1','Publish the reveal, gameplay and countdown wave','MARKETING_ASSISTANT'), ('MI-32','Launch','Launch Day','Publish the launch/download post across primary channels','MARKETING_ASSISTANT'), ('MI-33','Launch','Launch Day to D+7','Publish gameplay highlights, reactions, reviews and milestones','MARKETING_ASSISTANT'), ('MI-34','Launch','D+1 onward','Identify the strongest organic creative for paid promotion','MARKETING_LEAD'), ('MI-35','Verification','Before initial buzz','Verify the Infrastructure Ready gate','PROJECT_MANAGER'), ('MI-36','Verification','Before initial buzz','Verify the Channels Ready gate','PROJECT_MANAGER'), ('MI-37','Verification','Before initial buzz','Verify the Content Bank Ready gate','PROJECT_MANAGER'), ('MI-38','Verification','Before launch','Verify the Initial Buzz Ready gate and complete sign-off','PROJECT_MANAGER')
)
UPDATE "Task" AS task
SET "title" = source."title", "description" = 'Timing: ' || source."stage" || '. Update the checklist status and attach a public evidence link or note when applicable.',
    "checklistPhase" = source."phase", "checklistStage" = source."stage", "checklistOwnerRole" = source."ownerRole",
    "checklistDoneWhen" = source."title" || '; evidence or an operational note is recorded where applicable.',
    "checklistMandatory" = source."code" <> 'MI-15', "requiresReview" = TRUE
FROM source WHERE task."workstream" = 'MARKETING' AND task."checklistCode" = source."code";

UPDATE "ProjectWorkstream" SET "templateVersion" = '2' WHERE "workstream" = 'MARKETING';
