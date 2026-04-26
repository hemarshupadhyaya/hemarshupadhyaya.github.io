(function(){const o=document.createElement("link").relList;if(o&&o.supports&&o.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))r(a);new MutationObserver(a=>{for(const t of a)if(t.type==="childList")for(const i of t.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&r(i)}).observe(document,{childList:!0,subtree:!0});function s(a){const t={};return a.integrity&&(t.integrity=a.integrity),a.referrerPolicy&&(t.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?t.credentials="include":a.crossOrigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function r(a){if(a.ep)return;a.ep=!0;const t=s(a);fetch(a.href,t)}})();const l="/essays/shape-of-drug-development/";async function c(e){try{const o=await fetch(`${l}${e}`);return o.ok?await o.json():null}catch{return null}}function n(){return c("data-snapshot.json")}async function d(e){const s=(await n())?.data_year_range||"1985 – present";e.innerHTML=`
    <p class="crumbs"><a href="/">Hemarsh Upadhyaya</a> &nbsp;/&nbsp; Essays</p>
    <header class="hero">
      <h1 id="essay-title">The Shape of Drug Development</h1>
      <p class="dek">
        What does forty years of FDA novel drug approval look like in one place?
        A visual essay built from the public CDER record — what was approved,
        when, by what pathway, and for whom.
      </p>
      <div class="meta">
        <span>Visual essay</span>
        <span>FDA CDER, ${s}</span>
        <span>v0.1 — scaffold</span>
      </div>
      <div class="hero-stats" aria-label="Headline figures">
        <div class="hero-stat">
          <div class="value placeholder">—</div>
          <div class="label">Total approvals</div>
        </div>
        <div class="hero-stat">
          <div class="value placeholder">—</div>
          <div class="label">Years covered</div>
        </div>
        <div class="hero-stat">
          <div class="value placeholder">—</div>
          <div class="label">Therapeutic areas</div>
        </div>
      </div>
    </header>
  `}const p=[{id:"approvals",label:"Section 1",title:"Approval waves",body:`Year over year, novel drug approvals do not climb in a smooth line.
      They surge and dip — shaped by review reforms, industry cycles,
      and what the science was ready for. This section will trace those waves.`,chartNote:"Chart: novel approvals per year, 1985 – present."},{id:"application-type",label:"Section 2",title:"NDAs and BLAs",body:`The mix of small-molecule NDAs and biologic BLAs has shifted decisively
      since the early 2000s. We look at the balance over time, with a clear
      caveat that this view is CDER-scoped — most CBER-only biologics do not appear here.`,chartNote:"Chart: approvals split by application type, by year."},{id:"expedited",label:"Section 3",title:"The acceleration layer",body:`Priority review, accelerated approval, fast track, breakthrough therapy,
      orphan, first-in-class. These designations layer on top of the approval count
      and tell us how the regulatory shape of drug development has changed.`,chartNote:"Chart: expedited and special designations over time."},{id:"therapeutic-areas",label:"Section 4",title:"Where approvals cluster",body:`Approvals cluster around the diseases the science can reach.
      Oncology, infectious disease, and rare disorders dominate recent years —
      but the picture changes over five-year windows.`,chartNote:"Chart: therapeutic area ranking and 5-year heatmap."},{id:"dosage-forms",label:"Section 5",title:"How they are delivered",body:`Drug development is not just about molecules — it is about how
      patients receive them. Tablet, injection, infusion, inhaler.
      The dosage and route mix tells its own story.`,chartNote:"Chart: dosage form and route trends."},{id:"recent-years",label:"Section 6",title:"The latest cohort",body:`2025 closed with an enriched annual extract. 2026 is provisional —
      a year in progress. We surface the most recent approvals carefully,
      flagging what is final and what is not.`,chartNote:"Panel: recent approvals with provisional flag for the current year."}];function h(){return p.map(e=>`
        <section id="${e.id}" class="section" aria-labelledby="${e.id}-heading">
          <div class="section-label">${e.label}</div>
          <h2 id="${e.id}-heading">${e.title}</h2>
          <p>${e.body}</p>
          <div class="chart-placeholder" role="img" aria-label="${e.chartNote}">
            ${e.chartNote}
          </div>
        </section>
      `).join("")}async function u(){const e=await n(),o=e?.synced_at||"not yet synced",s=e?.source_commit||"not yet pinned";return`
    <section id="methodology" class="section methodology" aria-labelledby="methodology-heading">
      <div class="section-label">Methodology &amp; caveats</div>
      <h2 id="methodology-heading">What this essay does and does not show</h2>
      <p>
        This is a public-data visual essay built from the FDA CDER novel drug
        and new biologic approval record. It is not medical advice, not investment
        advice, and not a complete view of every approved drug.
      </p>
      <ul>
        <li>Scope is CDER-only. Most CBER-only biologics do not appear.</li>
        <li>Generics and many reformulations are excluded by source.</li>
        <li>Product and regulatory characteristics reflect status at original approval.</li>
        <li>2026 is provisional — the calendar year is in progress.</li>
        <li>No causal claims. Patterns shown are descriptive only.</li>
        <li>
          Source data and pipeline:
          <a href="https://github.com/hemarshupadhyaya/shape-of-drug-development-data-clean"
             target="_blank" rel="noopener">shape-of-drug-development-data-clean</a>.
        </li>
        <li>Data snapshot: synced ${o}, source commit ${s}.</li>
      </ul>
    </section>
  `}async function y(){const e=document.getElementById("essay");if(!e)return;const o=document.createElement("div"),s=document.createElement("div"),r=document.createElement("div"),a=document.createElement("div");a.className="separator",a.setAttribute("role","separator");const t=document.createElement("footer");t.className="footer",t.innerHTML="<p>Views expressed here are my own and not those of my employer.</p>",e.append(o,s,a,r,t),await d(o),s.innerHTML=h(),r.innerHTML=await u()}y();
