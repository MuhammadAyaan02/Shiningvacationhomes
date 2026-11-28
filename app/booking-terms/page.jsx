import {PageSchema} from '../../components/page-schema.jsx';
import {pageMetadata} from '../../src/seo.js';
import {AnimatedHeading} from '../../components/animated-heading.js';
import {ContextLink} from '../../components/site';
import {PrivacyContents as PageContents} from '../../components/privacy-contents.jsx';
import '../privacy-policy/privacy.css';
import './booking.css';

export const metadata=pageMetadata('/booking-terms/','Enquiries and Booking Information','Understand how an enquiry leads to available accommodation options, an individual quotation and confirmation. Review prices, inclusions and terms before committing.');

const sections=[
 {
  id:'share-your-plans',title:'Start with your requirements',
  content:<>
   <p>Share your approximate dates or planned duration, guest numbers, preferred area and budget. Flexible plans are welcome; you do not need every detail settled to start a conversation.</p>
   <p>The team will contact you to discuss suitable available options. This website showcases the types of accommodation we can offer or arrange. It does not show live availability or provide an instant booking service.</p>
  </>
 },
 {
  id:'review-the-accommodation',title:'Review the actual accommodation',
  content:<>
   <p>Website photographs and accommodation categories illustrate the kinds of spaces you can enquire about. They do not identify a particular available home or guarantee its location, features or availability.</p>
   <p>For an option you are considering, ask for current photographs, the exact location, layout, occupancy and relevant amenities. Discuss anything essential to your stay before deciding, including accessibility or specific household requirements.</p>
  </>
 },
 {
  id:'complete-quotation',title:'Understand the complete price',
  content:<>
   <p>Request an individual quotation for your dates and selected accommodation. Review what is included, what is charged separately and when any payments are due.</p>
   <ul className="booking-checklist"><li>The total accommodation price for the agreed stay.</li><li>Any additional fees, services or charges.</li><li>Any deposit, its purpose and the applicable return conditions.</li><li>Payment amounts, due dates and the agreed payment method.</li></ul>
   <p>If a detail is unclear, ask the team to explain it before committing. A category or illustrative photograph on this website is not a price offer.</p>
  </>
 },
 {
  id:'changes-and-cancellations',title:'Check changes and cancellations',
  content:<>
   <p>Request the cancellation, amendment and refund terms for the specific option before confirming. Ask how changing dates, shortening a stay or cancelling would affect the amount payable.</p>
   <p>This page does not set a universal cancellation period or refund policy. The applicable conditions should be supplied with the individual arrangement so you can review them before deciding.</p>
  </>
 },
 {
  id:'arrival-and-stay',title:'Know the details of your stay',
  content:<>
   <p>Confirm check-in and check-out times, the arrival process, occupancy limits and house rules. Ask which services are included and who to contact about arrival or a question during your stay.</p>
   <p>For longer stays, discuss the services and practical arrangements that matter to you, such as utilities, cleaning and any extension requirements. Confirm the details for your selected accommodation rather than assuming they are the same for every option.</p>
  </>
 },
 {
  id:'before-you-confirm',title:'Confirm with a clear understanding',
  content:<>
   <p>Before proceeding, request the confirmation process and review the accommodation details, complete quotation, payment arrangements and applicable terms together. Ask for clarification wherever something is missing or unclear.</p>
   <p>Sending an enquiry or receiving a website enquiry reference does not reserve accommodation, confirm a price or authorise a payment. This page is general booking information; it does not replace the terms supplied for an individual stay.</p>
   <p>Please do not send card details or identity documents through the enquiry form. If documents or payment are needed later, ask the team to explain the appropriate process.</p>
  </>
 }
];

export default function Page(){
 return <div className="privacy-page booking-page">
  <PageSchema path="/booking-terms/" name={metadata.title} description={metadata.description}/>
  <section className="page-intro privacy-hero wrap" aria-labelledby="booking-title">
   <div><p className="eyebrow"><span className="blue-line"/> BEFORE YOU CONFIRM</p><AnimatedHeading id="booking-title">Your stay.<br/><em>The details, clear.</em></AnimatedHeading></div>
   <div className="privacy-hero-copy"><p className="lead">From your first enquiry to an individual offer, know what to ask, what to review and what to confirm before you decide.</p><p className="booking-page-label">Enquiries &amp; booking information</p></div>
  </section>
  <section className="privacy-overview wrap" aria-labelledby="booking-overview-title">
   <h2 id="booking-overview-title" className="visually-hidden">Your next steps at a glance</h2>
   <div className="privacy-overview-grid">
    <div><span className="privacy-overview-label">01 / SHARE</span><h3>Tell us what matters.</h3><p>Your plans, preferences and the details that make a space work for you.</p></div>
    <div><span className="privacy-overview-label">02 / REVIEW</span><h3>Explore actual options.</h3><p>The team will discuss available accommodation and an individual quotation.</p></div>
    <div><span className="privacy-overview-label">03 / DECIDE</span><h3>Confirm with clarity.</h3><p>Review the complete price, practical details and applicable terms first.</p></div>
   </div>
   <div className="booking-enquiry-note"><span className="eyebrow">AN ENQUIRY IS A FIRST STEP</span><p>Submitting your requirements starts a conversation. It does not reserve a home, confirm a price or authorise a payment.</p></div>
  </section>
  <div className="privacy-layout wrap">
   <aside className="privacy-rail" aria-label="Booking information navigation">
    <PageContents items={sections.map(({id,title})=>({id,title}))}/>
    <p className="privacy-rail-note">Something you would like to clarify?<br/><a className="privacy-inline-link" href="mailto:info@shiningvacationhomes.com?subject=Booking%20question">Ask the team</a></p>
   </aside>
   <article className="prose privacy-content" aria-label="Enquiries and booking information in detail">
    {sections.map((section,index)=><section key={section.id} className="privacy-section" id={section.id} aria-labelledby={section.id+'-title'}>
     <div className="privacy-section-heading"><span className="privacy-section-number" aria-hidden="true">{String(index+1).padStart(2,'0')}</span><h2 id={section.id+'-title'}>{section.title}</h2></div>
     <div className="privacy-section-copy">{section.content}</div>
    </section>)}
   </article>
  </div>
  <section className="privacy-contact wrap" aria-labelledby="booking-contact-title">
   <div className="privacy-contact-inner">
    <div><p className="eyebrow">LET'S MAKE A PLAN</p><h2 id="booking-contact-title">A clearer next step<br/>for your Dubai stay.</h2><p>Share your requirements, or speak to the team before you do.</p></div>
    <div className="privacy-contact-actions"><ContextLink className="button" href="/contact/">Share your requirements</ContextLink><a className="text-link" href="mailto:info@shiningvacationhomes.com?subject=Booking%20question">Ask a booking question</a></div>
   </div>
  </section>
 </div>;
}
