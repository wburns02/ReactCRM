export function ServicesSection() {
  const services = [
    {
      title: "Septic Tank Pumping",
      description:
        "Regular pumping keeps your system healthy. We recommend every 3-5 years for most homes.",
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
        </svg>
      ),
      popular: true,
    },
    {
      title: "Septic Inspection",
      description:
        "Comprehensive inspection for real estate transactions or preventive maintenance.",
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
        </svg>
      ),
    },
    {
      title: "Repair & Maintenance",
      description:
        "Expert diagnosis and repair of septic issues. We fix problems before they become emergencies.",
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z" />
        </svg>
      ),
    },
    {
      title: "New Installation",
      description:
        "Full septic system installation for new construction or system replacement.",
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 12h-2v3h-3v2h5v-5zM7 9h3V7H5v5h2V9zm14-6H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16.01H3V4.99h18v14.02z" />
        </svg>
      ),
    },
    {
      title: "Emergency Service",
      description:
        "24/7 emergency response for backups, overflows, and urgent septic problems.",
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
      ),
      urgent: true,
    },
    {
      title: "Grease Trap Cleaning",
      description:
        "Commercial grease trap pumping and maintenance to keep your business compliant.",
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2l-5.5 9h11L12 2zm0 3.84L13.93 9h-3.87L12 5.84zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zM3 21.5h8v-2H3v2zm2.5-8.5H2v2h6v-6H6l-2 2.5L6 14h1v-1z" />
        </svg>
      ),
    },
  ];

  return (
    <section aria-labelledby="services-heading" className="py-16 md:py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 id="services-heading" className="text-3xl md:text-4xl font-bold text-mac-dark-blue mb-4">
            Our Septic Services
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            From routine pumping to emergency repairs, we handle all your septic
            system needs with professional care.
          </p>
        </div>

        {/* Services grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <div
              key={index}
              className={`bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border ${
                service.urgent
                  ? "border-red-200 bg-red-50/50"
                  : service.popular
                    ? "border-primary/30"
                    : "border-gray-100"
              }`}
            >
              {/* Badge */}
              {service.popular && (
                <span className="inline-block bg-primary text-white text-xs font-semibold px-2 py-1 rounded mb-3">
                  Most Popular
                </span>
              )}
              {service.urgent && (
                <span className="inline-block bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded mb-3">
                  24/7 Available
                </span>
              )}

              {/* Icon */}
              <div
                className={`w-14 h-14 rounded-lg flex items-center justify-center mb-4 ${
                  service.urgent
                    ? "bg-red-100 text-red-600"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {service.icon}
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {service.title}
              </h3>
              <p className="text-gray-600">{service.description}</p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            Not sure what service you need? We can help!
          </p>
          <a
            href="#quote"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:text-primary-hover transition-colors"
          >
            Get a free consultation
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
