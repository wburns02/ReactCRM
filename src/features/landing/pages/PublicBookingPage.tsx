import { BookingForm } from "../components/BookingForm";

export function PublicBookingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <img src="/logo.png" alt="MAC Septic" className="h-10 w-auto" />
          <a
            href="tel:5123530555"
            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
          >
            (512) 353-0555
          </a>
        </div>
      </header>

      {/* Booking Section */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Book Your Service</h2>
          <p className="text-gray-600 mt-2">
            Schedule septic pumping, inspections, and maintenance online
          </p>
        </div>

        <BookingForm />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-16">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} MAC Septic Services. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <a href="/privacy" className="hover:text-white">Privacy Policy</a>
            <a href="/terms" className="hover:text-white">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
