import { Layout } from "@/components/Layout";
import { useEffect } from "react";
import { Award, Users, Home, ShieldCheck } from "lucide-react";

const About = () => {
  useEffect(() => { document.title = "About — Novique Properties"; }, []);

  return (
    <Layout>
      <section className="bg-secondary text-secondary-foreground">
        <div className="container py-20">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary-glow">About Novique</span>
          <h1 className="mt-3 font-display text-4xl md:text-5xl font-bold max-w-3xl">
            Helping families find homes worth coming back to.
          </h1>
          <p className="mt-5 max-w-2xl text-secondary-foreground/80 text-lg leading-relaxed">
            Novique Properties is a Nigerian real-estate brand built on transparency, careful curation, and a deep respect for the people we serve.
          </p>
        </div>
      </section>

      <section className="container py-16">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-secondary">What We Do</h2>
        <p className="mt-4 text-muted-foreground max-w-3xl leading-relaxed">
          At Novique Properties, we provide a full spectrum of real estate and construction services designed to bring your vision to life and maximize the value of your investments.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {[
            { title: "Sales", body: "Whether buying or selling, we provide expert guidance to help clients make informed decisions. We market properties effectively and negotiate strategically to achieve the best possible outcomes." },
            { title: "Leasing", body: "We connect property owners with the right tenants through efficient and transparent leasing processes. Our team ensures proper screening, documentation, and smooth occupancy transitions." },
            { title: "Construction & Renovation", body: "We deliver high-quality construction and renovation solutions tailored to meet residential and commercial needs. From concept to completion, we ensure every project is executed with precision, durability, and attention to detail." },
            { title: "Property Management", body: "Our property management services are designed to give property owners peace of mind. We handle day-to-day operations, maintenance, tenant relations, and asset optimization to ensure your property performs at its best." },
            { title: "Cost Consultancy", body: "We offer professional cost consultancy services to help you plan, budget, and manage project expenses efficiently. Our goal is to ensure value for money while maintaining quality standards at every stage." },
          ].map((s) => (
            <div key={s.title} className="bg-card border border-border/60 rounded-2xl p-6 shadow-card">
              <h3 className="font-display text-xl font-bold text-secondary">{s.title}</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

      <section className="container py-16 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-bold text-secondary">Our story</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            We started Novique with a simple goal: make finding a great home feel less like a chore and more like a discovery. From the gated calm of Maitama and Asokoro to the buzzing energy of Lekki and Ikoyi, we work with vetted developers and homeowners to bring you properties you can actually trust.
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Every listing on this platform is reviewed by our team. We verify documentation, photograph each property properly, and make sure the price reflects real market value — not guesswork.
          </p>
        </div>
        <div>
          <h2 className="font-display text-3xl font-bold text-secondary">What drives us</h2>
          <ul className="mt-4 space-y-4 text-muted-foreground">
            <li><strong className="text-secondary">Trust first.</strong> No surprises, no hidden fees, no inflated prices.</li>
            <li><strong className="text-secondary">Quality over quantity.</strong> We'd rather show you ten great homes than a hundred mediocre ones.</li>
            <li><strong className="text-secondary">Local expertise.</strong> Our team lives and breathes Nigerian real estate.</li>
          </ul>
        </div>
      </section>

      <section className="bg-muted/40 border-y border-border/60 py-16">
        <div className="container grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: <Home />, n: "500+", l: "Homes listed" },
            { icon: <Users />, n: "1,200+", l: "Happy families" },
            { icon: <Award />, n: "12 yrs", l: "Industry experience" },
            { icon: <ShieldCheck />, n: "100%", l: "Verified listings" },
          ].map((s) => (
            <div key={s.l} className="bg-card rounded-2xl border border-border/60 p-6 shadow-card">
              <div className="grid place-items-center h-12 w-12 rounded-xl bg-accent text-primary">{s.icon}</div>
              <div className="mt-4 font-display text-3xl font-bold text-secondary">{s.n}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="container py-16 max-w-3xl">
        <h2 className="font-display text-3xl font-bold text-secondary">Achievements</h2>
        <div className="mt-6 space-y-5 text-muted-foreground leading-relaxed">
          <p>🏆 Recognised among Nigeria's emerging real-estate platforms in Abuja.</p>
          <p>🤝 Successfully closed transactions across all six geo-political zones of Nigeria.</p>
          <p>🏗 Long-standing partnerships with developers in Maitama and Asokoro, Lugbe, Gwarinpa, Katampe, Lifecamp, Jahi, Lekki, Ikoyi.</p>
          <p>📈 Consistent year-on-year growth in listings, clients, and team strength since launch.</p>
        </div>
      </section>
    </Layout>
  );
};

export default About;
