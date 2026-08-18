import React from 'react'
import { Link } from 'react-router-dom'

export default function OurStory() {
  return (
    <>
      <section id="Weekly-Interactive-Livestream" className="section is-bg_pattern_teal-outline">
        <div className="div-block-69">
          <div className="w-layout-blockcontainer container-large w-container">
            <div className="div-block-92">
              <h2 className="heading-14">We learned Foundry the hard way — so you don’t have to.</h2>
              <div className="div-block-94">
                <div className="paragraph">
                  <span className="text-span-8">We are a team of former Palantir engineers who love teaching.</span>
                  <br />
                  <br />
                  We get that Foundry doesn’t exactly come with a manual, and unlocking its powerful ROI depends on your team finding what they need, fast. That’s why we started Ontologize: to make it easier for teams to truly understand Palantir’s platforms and put them to work.
                  <br />
                  <br />
                  Ontologize is the only official Palantir partner that offers live, instructor-led training. We’ve trained hundreds of users from data engineers, to analysts, to executives.
                  <br />
                  <br />
                  We take the time to explain things. It’s probably why customers consistently rank their training experience with us 9/10. Reach out to get started.
                </div>
                <Link to="/contact" className="button-primary w-button">
                  Book a Discovery Call
                </Link>
              </div>
            </div>
            <div className="div-block-93">
              <img
                src="/cdn.prod.website-files.com/64b177d7207a0b5e76f37c0e/6840ce1cb98648110022ae73_Group%20shot.png"
                loading="lazy"
                alt="Ontologize Team Group Shot"
                className="image-33"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="section is-light_grey">
        <div className="w-layout-blockcontainer container-large w-container">
          <div className="div-block-36">
            <div className="section-title">
              <div className="div-block-34">
                <h2>Start learning</h2>
              </div>
            </div>
            <div className="w-layout-hflex flex-block-9">
              <div className="youtube-div">
                <div style={{ paddingTop: '56.17%' }} className="w-embed-youtubevideo">
                  <iframe
                    src="https://www.youtube.com/embed/kcMgaLi3Yqs?rel=0&controls=1&autoplay=0&mute=0&start=0"
                    frameBorder="0"
                    style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'auto' }}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    title="Speedrun Your First AIP Workflow"
                  ></iframe>
                </div>
              </div>
              <div className="youtube-div">
                <div style={{ paddingTop: '56.17%' }} className="w-embed-youtubevideo">
                  <iframe
                    src="https://www.youtube.com/embed/Uh0zpMUR6wY?rel=0&controls=1&autoplay=0&mute=0&start=0"
                    frameBorder="0"
                    style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'auto' }}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    title="Foundry Tutorial"
                  ></iframe>
                </div>
              </div>
              <div className="youtube-div">
                <div style={{ paddingTop: '56.17%' }} className="w-embed-youtubevideo">
                  <iframe
                    src="https://www.youtube.com/embed/TRIOCHJ6wdw?rel=0&controls=1&autoplay=0&mute=0&start=0"
                    frameBorder="0"
                    style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'auto' }}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    title="Deploying a Live Machine Learning Model in Foundry"
                  ></iframe>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Team Section */}
      <section className="section">
        <div className="w-layout-blockcontainer container-large w-container">
          <div className="div-block-36">
            <div className="section-title">
              <div className="div-block-34">
                <h2>Our team</h2>
              </div>
            </div>
          </div>
          <div>
            <div className="w-dyn-list">
              <div role="list" className="collection-list-_about-page-our-team w-dyn-items">
                <div role="listitem" className="w-dyn-item">
                  <div className="instructor-card">
                    <img
                      loading="lazy"
                      src="/cdn.prod.website-files.com/64b177d7207a0b5e76f37bc9/68432c04e9ecb3d4d287b1cf_Teddy%20Circle.png"
                      alt="Teddy Garland"
                    />
                    <div className="div-block-77">
                      <div className="div-block-78">
                        <div className="text-block-8">Teddy Garland</div>
                      </div>
                      <div className="div-block-76">
                        <div className="text-block-33">Engineer</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div role="listitem" className="w-dyn-item">
                  <div className="instructor-card">
                    <img
                      loading="lazy"
                      src="/cdn.prod.website-files.com/64b177d7207a0b5e76f37bc9/68432bf5310e5c3a370cda0e_Yurii%20Circle.png"
                      alt="Yurii Mashtalir"
                    />
                    <div className="div-block-77">
                      <div className="div-block-78">
                        <div className="text-block-8">Yurii Mashtalir</div>
                      </div>
                      <div className="div-block-76">
                        <div className="text-block-33">Engineer</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div role="listitem" className="w-dyn-item">
                  <div className="instructor-card">
                    <img
                      loading="lazy"
                      src="/cdn.prod.website-files.com/64b177d7207a0b5e76f37bc9/68432bebab134f32648aa271_Fendy%20Circle.png"
                      alt="Fendy Pierre"
                    />
                    <div className="div-block-77">
                      <div className="div-block-78">
                        <div className="text-block-8">Fendy Pierre</div>
                      </div>
                      <div className="div-block-76">
                        <div className="text-block-33">Engineer</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div role="listitem" className="w-dyn-item">
                  <div className="instructor-card">
                    <img
                      loading="lazy"
                      src="/cdn.prod.website-files.com/64b177d7207a0b5e76f37bc9/68432c2575f5eef2e416e46f_Michael%20Circle.png"
                      alt="Michael Woods"
                    />
                    <div className="div-block-77">
                      <div className="div-block-78">
                        <div className="text-block-8">Michael Woods</div>
                      </div>
                      <div className="div-block-76">
                        <div className="text-block-33">CFO</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div role="listitem" className="w-dyn-item">
                  <div className="instructor-card">
                    <img
                      loading="lazy"
                      src="/cdn.prod.website-files.com/64b177d7207a0b5e76f37bc9/68432ca229ff01ddb6cc30f2_Josh%20K%20Circle.png"
                      alt="Josh Kidwell"
                    />
                    <div className="div-block-77">
                      <div className="div-block-78">
                        <div className="text-block-8">Josh Kidwell</div>
                      </div>
                      <div className="div-block-76">
                        <div className="text-block-33">Creative Director</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div role="listitem" className="w-dyn-item">
                  <div className="instructor-card">
                    <img
                      loading="lazy"
                      src="/cdn.prod.website-files.com/64b177d7207a0b5e76f37bc9/683e2c0de6a412d9ec5e37b4_Josh%20circle.png"
                      alt="Josh Miller"
                    />
                    <div className="div-block-77">
                      <div className="div-block-78">
                        <div className="text-block-8">Josh Miller</div>
                      </div>
                      <div className="div-block-76">
                        <div className="text-block-33">AIP Developer, Foundry Instructor</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div role="listitem" className="w-dyn-item">
                  <div className="instructor-card">
                    <img
                      loading="lazy"
                      src="/cdn.prod.website-files.com/64b177d7207a0b5e76f37bc9/683e2c3abb8d2a252b0404ee_Gena%20Circle.png"
                      alt="Gena Coblentz"
                    />
                    <div className="div-block-77">
                      <div className="div-block-78">
                        <div className="text-block-8">Gena Coblentz</div>
                      </div>
                      <div className="div-block-76">
                        <div className="text-block-33">Data Scientist, Foundry Instructor</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div role="listitem" className="w-dyn-item">
                  <div className="instructor-card">
                    <img
                      loading="lazy"
                      src="/cdn.prod.website-files.com/64b177d7207a0b5e76f37bc9/683e2a4dbb8d2a252b02c22a_Taylor%20Circle.png"
                      alt="Taylor Gregoire-Wright"
                    />
                    <div className="div-block-77">
                      <div className="div-block-78">
                        <div className="text-block-8">Taylor Gregoire-Wright</div>
                      </div>
                      <div className="div-block-76">
                        <div className="text-block-33">Founder &amp; CEO</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div role="listitem" className="w-dyn-item">
                  <div className="instructor-card">
                    <img
                      loading="lazy"
                      src="/cdn.prod.website-files.com/64b177d7207a0b5e76f37bc9/683e2988d937ad69bedbadc1_shelby%20circle.png"
                      alt="Shelby Vanhooser"
                    />
                    <div className="div-block-77">
                      <div className="div-block-78">
                        <div className="text-block-8">Shelby Vanhooser</div>
                      </div>
                      <div className="div-block-76">
                        <div className="text-block-33">Engineer, Foundry Instructor</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div role="listitem" className="w-dyn-item">
                  <div className="instructor-card">
                    <img
                      loading="lazy"
                      src="/cdn.prod.website-files.com/64b177d7207a0b5e76f37bc9/683e2ca98f88d66403c82f3e_Ben%20Circle.png"
                      alt="Ben Thomas"
                    />
                    <div className="div-block-77">
                      <div className="div-block-78">
                        <div className="text-block-8">Ben Thomas</div>
                      </div>
                      <div className="div-block-76">
                        <div className="text-block-33">Data Scientist, Foundry Instructor</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
