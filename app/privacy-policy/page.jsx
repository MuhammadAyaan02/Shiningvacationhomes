import {PageSchema} from '../../components/page-schema.jsx';
import {pageMetadata} from '../../src/seo.js';
import {AnimatedHeading} from '../../components/animated-heading.js';
import {ContextLink} from '../../components/site';
import {PrivacyContents} from '../../components/privacy-contents.jsx';
import './privacy.css';

export const metadata=pageMetadata(
 '/privacy-policy/',
 'Privacy Policy and Enquiry Information',
 'Understand what you share with Shining Vacation Homes, how enquiry information is used and kept, and how to contact our team with privacy questions.'
);

const sections=[
 {
  id:'information-you-share',title:'The information you share',
  content:<>
   <p>When you send a stay enquiry, we ask for your name and email so the team can reply. You can also share a phone number, approximate dates or duration, guest numbers, accommodation preferences, preferred area, budget and a message.</p>
   <p>For property-management enquiries, you can share relevant property details instead. Optional fields help explain your requirements; you do not need to fill in every detail to start a conversation.</p>
  </>
 },
 {
  id:'how-information-is-used',title:'How your enquiry is used',
  content:<>
   <p>The team uses your information to understand your requirements, respond to your questions and discuss suitable available accommodation or property-management services.</p>
   <p>Sending the form starts an enquiry. It does not reserve accommodation, authorise a payment or sign you up to an advertising newsletter.</p>
  </>
 },
 {
  id:'services-that-process-enquiries',title:'Services that process enquiries',
  content:<>
   <p>The website hosting service processes your submission. An email delivery service also processes the notification when it is sent to the team. The configured email service is Google/Gmail, or Resend if selected for delivery.</p>
   <p>Hosting and delivery services may process technical information and operational logs needed to run their services. Their own privacy information is available from <a href="https://policies.google.com/privacy" className="privacy-inline-link">Google</a> and <a href="https://resend.com/legal/privacy-policy" className="privacy-inline-link">Resend</a>.</p>
  </>
 },
 {
  id:'website-records-and-retention',title:'Website records and retention',
  content:<>
   <p>An accepted enquiry is kept as an encrypted website record so it can be recovered if an email notification fails. Website enquiry records have a 30-day expiry. Expired records are excluded from the enquiry tools and removed through operational cleanup.</p>
   <p>Where supported by our hosting, short-lived protected network identifiers help limit repeated submissions. These are kept separately from your enquiry; the raw network address is not added to the saved enquiry or email.</p>
   <p>This expiry applies to website enquiry records. Email correspondence and records held separately by the team follow the team’s retention arrangements. Contact us if you would like to understand those arrangements or ask about deletion.</p>
  </>
 },
 {
  id:'links-and-tracking',title:'Links, preferences and tracking',
  content:<>
   <p>Dates, guest counts and accommodation preferences may appear in links to carry your choices between pages. Someone you share one of these links with may be able to see those preferences.</p>
   <p>The enquiry form sends your contact details and message in the submission, rather than adding them to the page address. Images and fonts are served by this website. No advertising or analytics scripts have been added to the site.</p>
  </>
 },
 {
  id:'sharing-information-carefully',title:'Sharing information carefully',
  content:<>
   <p>Please share only what is relevant to your enquiry. Do not include card details, identity documents or sensitive personal information in the form.</p>
   <p>You can contact the team before submitting if you would prefer to discuss what information is needed. Any later booking, payment or document requirements should be explained for the individual arrangement.</p>
  </>
 },
 {
  id:'your-questions-and-requests',title:'Your questions and requests',
  content:<>
   <p>You can ask about access, correction or deletion of information you have shared through this website. Email <a className="privacy-inline-link" href="mailto:info@shiningvacationhomes.com">info@shiningvacationhomes.com</a> and explain your question or request.</p>
   <p>If available, include your enquiry reference and the email address used for the enquiry so the team can locate the relevant record. The team can explain what is needed to review your request.</p>
  </>
 }
];

export default function Page(){
 return <div className="privacy-page">
  <PageSchema path="/privacy-policy/" name={metadata.title} description={metadata.description}/>
  <section className="page-intro privacy-hero wrap" aria-labelledby="privacy-title">
   <div className="privacy-hero-heading">
    <p className="eyebrow"><span className="blue-line"/> YOUR INFORMATION</p>
    <AnimatedHeading id="privacy-title">Privacy, in plain<br/><em>language.</em></AnimatedHeading>
   </div>
   <div className="privacy-hero-copy">
    <p className="lead">Your Dubai plans are personal. Here is how the information you share helps us respond to your enquiry, and where to turn if you have a question.</p>
    <p className="privacy-updated">Last updated <time dateTime="2026-11-24">24 November 2026</time></p>
   </div>
  </section>

  <section className="privacy-overview wrap" aria-labelledby="privacy-overview-title">
   <h2 id="privacy-overview-title" className="visually-hidden">Privacy at a glance</h2>
   <div className="privacy-overview-grid">
    <div><span className="privacy-overview-label">01 / THE DETAILS</span><h3>What you choose to share.</h3><p>Your contact details and the information relevant to your stay or property enquiry.</p></div>
    <div><span className="privacy-overview-label">02 / THE PURPOSE</span><h3>A useful conversation.</h3><p>To understand your requirements and respond with relevant information and next steps.</p></div>
    <div><span className="privacy-overview-label">03 / YOUR QUESTIONS</span><h3>A direct point of contact.</h3><p>Ask the team about your information, or request access, correction or deletion.</p></div>
   </div>
  </section>

  <div className="privacy-layout wrap">
   <aside className="privacy-rail" aria-label="Privacy information navigation">
    <PrivacyContents items={sections.map(({id,title})=>({id,title}))}/>
    <p className="privacy-rail-note">A question before you share?<br/><a className="privacy-inline-link" href="mailto:info@shiningvacationhomes.com?subject=Privacy%20question">Email the team</a></p>
   </aside>
   <article className="prose privacy-content" aria-label="Privacy information in detail">
    {sections.map((section,index)=><section key={section.id} className="privacy-section" id={section.id} aria-labelledby={section.id+'-title'}>
     <div className="privacy-section-heading"><span className="privacy-section-number" aria-hidden="true">{String(index+1).padStart(2,'0')}</span><h2 id={section.id+'-title'}>{section.title}</h2></div>
     <div className="privacy-section-copy">{section.content}</div>
    </section>)}
   </article>
  </div>

  <section className="privacy-contact wrap" aria-labelledby="privacy-contact-title">
   <div className="privacy-contact-inner">
    <div><p className="eyebrow">LET’S KEEP THINGS CLEAR</p><h2 id="privacy-contact-title">Questions about<br/>your information?</h2><p>You can speak to the team before sharing your plans.</p></div>
    <div className="privacy-contact-actions"><a className="button" href="mailto:info@shiningvacationhomes.com?subject=Privacy%20question">Email us about privacy</a><ContextLink className="text-link" href="/contact/">Other ways to contact us</ContextLink></div>
   </div>
  </section>
 </div>;
}
