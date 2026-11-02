import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  scrollToSection,
  NAV_HEIGHT,
  STICKY_TRIGGER_OFFSET,
} from "../utils/scrollToSection";
import "./MethodologyPage.css";

// Sections that appear as sticky titles on the left (and as gutter headings).
const STICKY_SECTIONS = [
  { id: "methodology-report", level: 1, title: "Report" },
  { id: "methodology-database", level: 1, title: "Database" },
  { id: "methodology-resources", level: 1, title: "Resources" },
  { id: "methodology-credits", level: 1, title: "Credits" },
];

const Ext = ({ href = "#", children }) => (
  <a
    className="methodology-link-ext"
    href={href}
    target="_blank"
    rel="noopener noreferrer"
  >
    <span className="methodology-link-label">{children}</span>
    <span className="methodology-link-arrow" aria-hidden="true">
      ↗
    </span>
  </a>
);

// Internal hyperlink handled by react-router.
const Int = ({ to, children }) => (
  <Link className="methodology-link" to={to}>
    {children}
  </Link>
);

const Download = ({ href = "#", children }) => (
  <a className="methodology-download" href={href} download>
    {children}
    <span className="methodology-download-glyph" aria-hidden="true">
      ↓
    </span>
  </a>
);

// Contributor credits, shown in the Credits section, grouped by role.
const CREDITS = [
  { role: "Project Lead", names: ["Giovanna Reder"] },
  { role: "Project Supervision", names: ["Lorenzo Pezzani"] },
  {
    role: "Design & Development",
    names: [
      "Lachlan Kermode",
      "Sophia Lawler-Dormer",
      "Lara Coromina and Ariadna Serrahima (ODD)",
      "Giovanna Reder",
      "Lorenzo Pezzani",
    ],
  },
  { role: "Data Analysis", names: ["Stanislas Michel"] },
  {
    role: "Research and text",
    names: [
      "Lorenzo Pezzani",
      "Giovanna Reder",
      "Chiara Denaro",
      "Isabella Crispino",
    ],
  },
  {
    role: "Review",
    names: [
      "Sasha Milonova",
      "Kiri Santer",
      "Bérénice Gaudin",
      "Romina Kumria",
      "Judith Sunderland",
    ],
  },
  { role: "Thanks to:",
    names: [
      "Sea-Watch",
      "Alarmphone",
      "Civil MRCC",
      "Pilotes Volontaires",
      "Malta Migration Archive",
      "Allison West",
      "Inferstudio",
      "IRPI",
      "Revue21",
      "Antoine Harari",
      "Matthias Monroy",
     ]
  }
];

const grades = [
  {
    grade: "Grade 4",
    criteria: "All filtered maritime interceptions recorded in JORA",
    summary: "Documented interception (baseline)",
    cases: "1109",
  },
  {
    grade: "Grade 3",
    criteria: "Grade 4 + detection by Frontex asset",
    summary: "Interception detected by Frontex aerial asset",
    cases: "486",
  },
  {
    grade: "Grade 2",
    criteria:
      "Grade 4 + case matched with separate surveillance operation on same date and People on Board",
    summary: "Indirect confirmation via case matching",
    cases: "123",
  },
  {
    grade: "Grade 1",
    criteria: "Grade 2 + detection was initiated by Frontex",
    summary: "Confirmed aerial detection and initiation by Frontex",
    cases: "81",
  },
];

const MethodologyPage = () => {
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      const readLine = NAV_HEIGHT + STICKY_TRIGGER_OFFSET;
      let activeSectionId = null;
      STICKY_SECTIONS.forEach((s) => {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= readLine) activeSectionId = s.id;
      });
      setActiveId(activeSectionId);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="methodology-page">
      <nav className="methodology-nav">
        <h1 className="methodology-nav-title">About and Methodology</h1>
        {STICKY_SECTIONS.map((s) => (
          <button
            key={s.id}
            className={`methodology-nav-item${s.id === activeId ? " active" : ""}`}
            onClick={() => scrollToSection(s.id)}
          >
            {s.title}
          </button>
        ))}
      </nav>
      <div className="methodology-container">
        <section id="methodology-intro" className="methodology-section">
          <p>
            The Aerial Bordering platform was produced by LIMINAL, a research
            agency based in the University of Bologna, Italy, and was first
            published online in November 2026. It offers the first systematic
            study of Frontex aerial surveillance operations in the Central
            Mediterranean between 2017 and today.
          </p>
          <p>
            Through spatial and data analysis, open source investigative
            methods, and policy research, it accounts for the staggering
            expansion of Frontex aerial surveillance programs and reveals its
            key role in the interception and forced return of migrants to
            Libya and Tunisia. The platform is the result of more than three
            years of in-depth research and builds on previous work undertaken
            by members of the Liminal team towards the{" "}
            <Ext href="https://www.hrw.org/video-photos/interactive/2022/12/08/airborne-complicity-frontex-aerial-surveillance-enables-abuse">Airborne Complicity report</Ext> published by Human Rights
            Watch and Border Forensics, as well as the{" "}
            <Ext href="https://liminal-lab.org/work/asymmetric-visions">Asymmetric Visions</Ext> video investigation by Liminal.
          </p>
          <p>
            The platform comprises two main components: a narrative{" "}
            <Int to="/report" arrow={false}>Report</Int> and a data-driven{" "}
            <Int to="/database" arrow={false}>Database</Int>. Together, these elements seek
            to pierce the veil of opacity shrouding the practice of aerial
            bordering.
          </p>
        </section>

        <section id="methodology-report" className="methodology-section">
          <h2 className="methodology-heading">Report</h2>
          <p>
            The <Int to="/report">Report</Int> provides a historical and
            political genealogy of aerial bordering, explaining why aerial
            surveillance has become so prominent in European border
            enforcement and why this constitutes a serious human rights
            issue. It functions as a critical companion to the database
            section of this platform, allowing readers to contextualise and
            make sense of the data-driven analysis provided therein.
          </p>
          <p>It draws on a range of sources and methodologies:</p>
          <ol type="a" className="methodology-list">
            <li>
              interviews conducted over two years with a variety of relevant
              figures: a retired Italian Coast Guard admiral; operatives from
              Sea-Watch's "Airborne" division and the Humanitarian Pilots
              Initiative, the two NGOs conducting aerial monitoring missions
              in the Central Mediterranean; representatives of three NGOs
              involved in search and rescue activities in the Central
              Mediterranean; Frontex's "Fundamental Rights Officer" (FRO);
              two investigative journalists who have published extensively
              on Frontex's aerial surveillance programme and several
              migrants who had themselves witnessed aerial surveillance
              while crossing the Mediterranean by boat. Interviews with
              Frontex personnel as well as EUNAVFOR Med and Italian Guardia
              di Finanza operatives were requested but not granted;
            </li>
            <li>
              an extensive review of existing academic and journalistic
              literature on the subject;
            </li>
            <li>
              a review of primary data and materials, including policy and
              financial documents produced by Frontex as well as various
              national and EU institutions, NGOs, human rights groups, and
              others; data obtained through Freedom of Information requests
              and/or leaked by journalists and NGOs;
            </li>
            <li>
              OSINT methodologies, specifically concerning the identities
              and activities of aircraft operating on behalf of Frontex;
            </li>
            <li>cartography, spatial and data analysis.</li>
          </ol>
          <p>
            No analysis of what is happening in the Central Mediterranean
            would be possible without the tireless documentation work
            undertaken by non-governmental groups, activists and
            organisations such as the Alarm Phone, Sea-Watch, the
            Humanitarian Pilots Initiative and the fleet of NGO-operated
            civil vessels that actively rescue people in distress while also
            bearing witness to the shifting operations of actors in the
            Central Mediterranean. The estimate of Frontex's annual
            expenditure on aerial surveillance is based on publicly available
            tender documents and was produced in collaboration with IrpiMedia.
          </p>
        </section>

        <section id="methodology-database" className="methodology-section">
          <h2 className="methodology-heading">Database</h2>
          <p>
            Our <Int to="/database">Database</Int> aims to make visible,
            through data visualisation, the growing role of the Agency's
            aerial surveillance program in what we refer to as the{" "}
            “pushback machine” in the Central
            Mediterranean, i.e. the interception of migrants at sea and
            their forcible return to Libya and Tunisia. It also aims to make
            accessible and understandable critical information that can be
            further explored by other researchers in their own investigative
            work.
          </p>
          <p>
            In order to do that, it draws together three distinct kinds of
            information from different sources:
          </p>

          <h3 className="methodology-subheading">
            Data concerning pushbacks from Frontex and EUNAVFOR MED Irini
          </h3>
          <p>
            The starting point and key dataset presented in our database
            derives from Frontex's Joint Operation Reporting Application
            (JORA). JORA is a standardised information system established
            and maintained by Frontex, in collaboration with EU Member
            States and other EU institutions. It has been used since 2011 by
            European officials taking part in Frontex Joint Operations to
            archive and share information about border crossing{" "}
            “incidents” and other significant events taking
            place across all European borders. Data used in our analysis of
            JORA was obtained through three distinct Freedom of Information
            requests, each covering a consecutive period (2016-2021;
            2021-2023; 2023-2025) and corresponding to the three sections of
            the timeline visible on the <Int to="/database">Database</Int>{" "}
            page.
          </p>
          <p>
            Given that the surveillance of the EU's borders represents one
            of the Agency's key objectives, and that the data is collected
            by Frontex itself for internal use, this dataset is likely to
            constitute one of the most complete records of its activities in
            the Central Mediterranean. The Agency, however, does not offer
            any insight as to how the data is collected and categorised,
            making its interpretation far from straightforward. Moreover,
            data was increasingly difficult to obtain (the last dataset was
            initially denied and then released only after an appeal was
            filed), and a growing amount of critical information which was
            present in the first dataset was redacted in further releases.
            This necessitated an in-depth analysis of the data, which is
            available in more detail as pdf downloadable below and is only
            briefly summarised here.
          </p>
          <p>
            The three combined JORA datasets contain a total of 319,040
            entries, data points about what the Agency defines as{" "}
            “border incidents” that took place across the
            EU and its external borders. In order to identify within this
            large dataset all cases of pushback that took place in the
            Central Mediterranean and that saw the involvement of Frontex
            aerial surveillance, we had to undertake a number of steps.
          </p>
          <p>
            First, we identified a total of 1,109 cases of pushbacks
            (corresponding to a total of 57,138 people forcibly returned to
            Libya or Tunisia) in the Central Mediterranean documented by
            Frontex between 14 September 2016 and 10 July 2023, covering the
            periods included in the first two JORA releases. Since the third
            JORA dataset was heavily redacted, it was not possible to
            conduct the same type of analysis on the last JORA dataset
            obtained, the one covering the 2023-2025 period.
          </p>
          <p>
            Secondly, we applied a grading system to the 1,109 identified
            cases, designed to capture two distinct dimensions: (i)
            Frontex's operational role in the event, ranging from mere
            awareness to active participation or triggering through aerial
            detection or on-scene monitoring and (ii) the strength of the
            supporting evidence, ranging from minimal documentation to
            corroborated cases. This resulted in the categorisation of cases
            into four distinct grades, as outlined below:
          </p>

          <div className="methodology-table-wrap">
            <table className="methodology-table">
              <thead>
                <tr>
                  <th>Grade</th>
                  <th>Criteria</th>
                  <th>Summary Description</th>
                  <th>Number of Cases</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g) => (
                  <tr key={g.grade}>
                    <td>{g.grade}</td>
                    <td>{g.criteria}</td>
                    <td>{g.summary}</td>
                    <td>{g.cases}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            The cases displayed in the <Int to="/database">Database</Int>{" "}
            section correspond to those classified as Grade 3, namely, all
            cases of documented pushbacks in which Frontex's planes or drones
            were directly involved in detecting boats that were eventually
            forcibly returned to Libya or Tunisia. These amount to 486 cases
            of pushbacks that took place in the Central Mediterranean between
            12 August 2018 and 25 January 2023, resulting in the forced return
            of at least 27,892 people. These figures are not hypothetical, but
            those recorded by the Agency itself.
          </p>
          <p>
            In order to extend our analysis further in time, we resorted to
            data contained in a leaked document produced by EUNAVFOR MED
            Operation Irini, the European Union's military maritime security
            operation in the Central Mediterranean. In it, it was possible to
            identify, for the timespan between February 2023 and October 2024,
            177 cases of pushbacks involving Frontex aerial surveillance, for a
            total of 8,139 people intercepted at sea and returned to Libya or
            Tunisia.
          </p>
          <p>
            This brings the total number of recorded pushbacks involving
            Frontex aerial surveillance between August 2018 and October
            2024 to at least 611, for a total of 33,107 passengers who were
            intercepted and forcibly returned to Libya or Tunisia across the
            combined JORA and EUNAVFOR MED datasets.
          </p>
          <p>
            In any case, considering Frontex's lack of transparency and the
            fact that no actor has a full overview of what happens at sea,
            this is likely to represent only a fraction of the overall number
            of pushbacks that effectively took place in the Central
            Mediterranean during this period. This opacity sits uneasily
            with the commitment to transparency that Executive Director Hans
            Leijtens has claimed since taking office in late 2022. In
            practice, our attempts to obtain data through Freedom of
            Information requests have met with increasingly restrictive
            responses, revealing a widening gap between the agency's public
            rhetoric and its actual disclosure practices.
          </p>

          <h3 className="methodology-subheading">Flight Data</h3>
          <p>
            The second key source of information used in our analysis is
            flight data pertaining to Frontex aerial assets operating in the
            Central Mediterranean, visible in the left column of our{" "}
            <Int to="/database">Database</Int>. For each day, we provide an
            overall number of hours flown by aircraft operated on behalf of
            Frontex, as well as a HEX code that allows each aircraft to be
            identified.
          </p>
          <p>
            This data was compiled from open-source aircraft tracking
            websites and is, for a number of reasons, incomplete. Aircraft
            can intentionally switch off their transponders, and tracking
            signals are occasionally lost. In addition, Frontex does not
            publicly disclose which aircraft are operating on its behalf in
            the Central Mediterranean. As a result, the list we have
            compiled may not account for all the aircraft operating on
            behalf of Frontex at all times.
          </p>
          <p>
            Despite these limitations, this information serves two purposes.
            First it allows us to identify which aircraft were present on a
            given day and therefore likely involved in the detection and
            monitoring of documented pushback cases, providing a useful
            basis for future investigations. Second, it provides an insight
            into the intensity of Frontex's aerial presence over time: with
            darker hues corresponding to higher number of hours flown per
            day, the intensity of the blue bars along the timeline
            visualises the expansion of Frontex aircraft.
          </p>

          <h3 className="methodology-subheading">
            Data collected by non-governmental organisations concerning
            different violations
          </h3>
          <p>
            Finally, we consulted information collected by two
            non-governmental organisations working directly in the field:
            the emergency hotline{" "}
            <Ext href="https://watchthemed.net">Watch the Med Alarmphone</Ext>{" "}
            and the rescue organization{" "}
            <Ext href="https://sea-watch.org">Sea-Watch</Ext>. Their data were
            essential in shedding light on specific incidents, highlighting
            the critical gaps that persist in the Frontex documentation of
            these events. Moreover, by combining them with the other
            sources, we were able to move beyond isolated incidents and
            identify recurring patterns in the practice of aerial bordering.
          </p>
          <p>
            This collection of evidence highlights three recurring
            operational patterns of Frontex's aerial bordering program that
            are directly contributing to border violence, which are
            unpacked in detail in our <Int to="/report">Report</Int>. By
            clicking on the categories visible in the leftmost column of our{" "}
            <Int to="/database">Database</Int>, users can search the data by
            category of patterns to reveal additional information about the
            specific events in each pattern.
          </p>
        </section>

        <section id="methodology-resources" className="methodology-section">
          <h2 className="methodology-heading">Resources</h2>
          <ul className="methodology-downloads">
            <li>
              <Download href="/downloads/LIMINAL_AerialBordering_JORA_Dataset.xlsx">
                Download the full JORA Dataset appearing in our Database
                (2019-2023) here
              </Download>
            </li>
            <li>
              <Download href="/downloads/LIMINAL_AerialBordering_EUNAVFORMEDIrini_Dataset.xlsx">
                Download EUNAVFOR MED Irini Dataset (2023-2024) here
              </Download>
            </li>
            <li>
              <Download href="/downloads/LIMINAL_AerialBordering_DataAnalysis.pdf">LIMINAL Data Analysis (2025)</Download>
            </li>
          </ul>
        </section>

        <section id="methodology-credits" className="methodology-section">
          <h2 className="methodology-heading">Credits</h2>
          <dl className="methodology-credits">
            {CREDITS.map(({ role, names }) => (
              <div key={role} className="methodology-credit">
                <dt className="methodology-credit-role">{role}</dt>
                {names.map((name, i) => (
                  <dd key={`${role}-${name}-${i}`} className="methodology-credit-name">
                    {name}
                  </dd>
                ))}
              </div>
            ))}
          </dl>
          <div className="methodology-funding">
            <img
              className="methodology-funding-logo"
              src="/logo-erc.png"
              alt="European Research Council"
            />
            <p>
              Funded by the European Union (ERC, HEMIG, 101042338). Views and
              opinions expressed are however those of the author(s) only and do
              not necessarily reflect those of the European Union or the
              European Research Council Executive Agency. Neither the European
              Union nor the granting authority can be held responsible for them.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MethodologyPage;
