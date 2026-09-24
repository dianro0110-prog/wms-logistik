"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Save,
  RefreshCw,
  Loader2,
  Phone,
  Mail,
  MapPin,
  ArrowLeftCircle,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

type CustomerStatus = "ACTIVE" | "INACTIVE";

type Customer = {
  id: number;
  customer_code: string;
  customer_name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  email: string | null;
  contact_person: string | null;
  status: CustomerStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type CustomerForm = {
  customer_code: string;
  customer_name: string;
  address: string;
  city: string;
  province: string;
  phone: string;
  email: string;
  contact_person: string;
  status: CustomerStatus;
  notes: string;
};

const emptyForm: CustomerForm = {
  customer_code: "",
  customer_name: "",
  address: "",
  city: "",
  province: "",
  phone: "",
  email: "",
  contact_person: "",
  status: "ACTIVE",
  notes: "",
};

export default function CustomerPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(
    null
  );
  const [form, setForm] = useState<CustomerForm>(emptyForm);

  const loadCustomers = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("customers")
      .select(
        `
        id,
        customer_code,
        customer_name,
        address,
        city,
        province,
        phone,
        email,
        contact_person,
        status,
        notes,
        created_at,
        updated_at
        `
      )
      .order("customer_name", { ascending: true });

    if (error) {
      console.error(error);
      alert(`Gagal mengambil data customer: ${error.message}`);
      setCustomers([]);
    } else {
      setCustomers((data ?? []) as Customer[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const filteredCustomers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return customers;

    return customers.filter((customer) => {
      return (
        customer.customer_code.toLowerCase().includes(keyword) ||
        customer.customer_name.toLowerCase().includes(keyword) ||
        (customer.contact_person ?? "").toLowerCase().includes(keyword) ||
        (customer.phone ?? "").toLowerCase().includes(keyword) ||
        (customer.email ?? "").toLowerCase().includes(keyword) ||
        (customer.city ?? "").toLowerCase().includes(keyword) ||
        (customer.province ?? "").toLowerCase().includes(keyword)
      );
    });
  }, [customers, search]);

  const totalCustomer = customers.length;

  const activeCustomer = customers.filter(
    (customer) => customer.status === "ACTIVE"
  ).length;

  const inactiveCustomer = customers.filter(
    (customer) => customer.status === "INACTIVE"
  ).length;

  const openAddModal = () => {
    setEditingCustomer(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);

    setForm({
      customer_code: customer.customer_code ?? "",
      customer_name: customer.customer_name ?? "",
      address: customer.address ?? "",
      city: customer.city ?? "",
      province: customer.province ?? "",
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      contact_person: customer.contact_person ?? "",
      status: customer.status ?? "ACTIVE",
      notes: customer.notes ?? "",
    });

    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingCustomer(null);
    setForm(emptyForm);
  };

  const updateForm = <K extends keyof CustomerForm>(
    field: K,
    value: CustomerForm[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveCustomer = async () => {
    const customerCode = form.customer_code.trim().toUpperCase();
    const customerName = form.customer_name.trim();

    if (!customerCode) {
      alert("Customer Code wajib diisi.");
      return;
    }

    if (!customerName) {
      alert("Customer Name wajib diisi.");
      return;
    }

    if (form.email.trim()) {
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email.trim()
      );

      if (!emailValid) {
        alert("Format email tidak valid.");
        return;
      }
    }

    setSaving(true);

    const payload = {
      customer_code: customerCode,
      customer_name: customerName,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      province: form.province.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      contact_person: form.contact_person.trim() || null,
      status: form.status,
      notes: form.notes.trim() || null,
    };

    let error;

    if (editingCustomer) {
      const result = await supabase
        .from("customers")
        .update(payload)
        .eq("id", editingCustomer.id);

      error = result.error;
    } else {
      const result = await supabase.from("customers").insert(payload);

      error = result.error;
    }

    if (error) {
      console.error(error);

      if (error.code === "23505") {
        alert("Customer Code sudah digunakan.");
      } else {
        alert(`Gagal menyimpan customer: ${error.message}`);
      }

      setSaving(false);
      return;
    }

    alert(
      editingCustomer
        ? "Customer berhasil diperbarui."
        : "Customer berhasil ditambahkan."
    );

    setSaving(false);
    closeModal();
    await loadCustomers();
  };

  const deleteCustomer = async (customer: Customer) => {
    const confirmed = window.confirm(
      `Yakin ingin menghapus customer "${customer.customer_name}"?`
    );

    if (!confirmed) return;

    setDeleting(customer.id);

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", customer.id);

    if (error) {
      console.error(error);
      alert(`Gagal menghapus customer: ${error.message}`);
      setDeleting(null);
      return;
    }

    alert("Customer berhasil dihapus.");

    setDeleting(null);
    await loadCustomers();
  };

  return (
    <main className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {/* BACK BUTTON */}
            <button
              type="button"
              onClick={() => router.push("/system")}
              title="Kembali"
              className="
                flex h-10 w-10 shrink-0 items-center justify-center
                rounded-full border border-slate-200 bg-white
                text-slate-600 shadow-sm
                transition-all duration-200
                hover:-translate-x-0.5 hover:bg-slate-50
                hover:text-slate-900 hover:shadow-md
                active:scale-95
              "
            >
              <ArrowLeftCircle size={22} strokeWidth={1.8} />
            </button>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Users size={21} strokeWidth={1.8} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl">
                Customer
              </h1>

              <p className="hidden text-xs text-slate-500 sm:block">
                Master data customer
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="
              flex shrink-0 items-center gap-2 rounded-xl
              bg-blue-600 px-4 py-2.5 text-sm font-semibold
              text-white shadow-sm transition
              hover:bg-blue-700 active:scale-95
            "
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Tambah Customer</span>
            <span className="sm:hidden">Tambah</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        {/* STATISTICS */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Total Customer
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {totalCustomer}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Users size={20} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Active
                </p>

                <p className="mt-1 text-2xl font-bold text-emerald-600">
                  {activeCustomer}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Inactive
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-500">
                  {inactiveCustomer}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <div className="h-3 w-3 rounded-full bg-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* SEARCH HEADER */}
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Daftar Customer
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                {filteredCustomers.length} customer ditampilkan
              </p>
            </div>

            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari customer..."
                  className="
                    h-10 w-full rounded-xl border border-slate-200
                    bg-slate-50 pl-9 pr-3 text-sm text-slate-900
                    outline-none transition
                    placeholder:text-slate-400
                    focus:border-blue-500 focus:bg-white
                    focus:ring-2 focus:ring-blue-100
                  "
                />
              </div>

              <button
                type="button"
                onClick={loadCustomers}
                disabled={loading}
                title="Refresh"
                className="
                  flex h-10 w-10 shrink-0 items-center justify-center
                  rounded-xl border border-slate-200 bg-white
                  text-slate-600 transition
                  hover:bg-slate-50 hover:text-slate-900
                  disabled:cursor-not-allowed disabled:opacity-50
                "
              >
                <RefreshCw
                  size={17}
                  className={loading ? "animate-spin" : ""}
                />
              </button>
            </div>
          </div>

          {/* LOADING */}
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 size={18} className="animate-spin" />
                Memuat data customer...
              </div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            /* EMPTY */
            <div className="flex min-h-[300px] flex-col items-center justify-center px-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Users size={26} />
              </div>

              <h3 className="mt-4 font-semibold text-slate-900">
                {search
                  ? "Customer tidak ditemukan"
                  : "Belum ada data customer"}
              </h3>

              <p className="mt-1 max-w-sm text-sm text-slate-500">
                {search
                  ? "Coba gunakan kata kunci pencarian yang berbeda."
                  : "Silakan tambahkan customer baru untuk mulai menggunakan master customer."}
              </p>

              {!search && (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="
                    mt-4 flex items-center gap-2 rounded-xl
                    bg-blue-600 px-4 py-2.5 text-sm font-semibold
                    text-white transition hover:bg-blue-700
                  "
                >
                  <Plus size={17} />
                  Tambah Customer
                </button>
              )}
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[950px]">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Customer
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Contact
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Lokasi
                      </th>

                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>

                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredCustomers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {customer.customer_name}
                            </p>

                            <p className="mt-0.5 text-xs font-medium text-blue-600">
                              {customer.customer_code}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            {customer.contact_person && (
                              <p className="text-sm text-slate-700">
                                {customer.contact_person}
                              </p>
                            )}

                            {customer.phone && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Phone size={13} />
                                {customer.phone}
                              </div>
                            )}

                            {customer.email && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Mail size={13} />
                                {customer.email}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-start gap-1.5 text-sm text-slate-600">
                            <MapPin
                              size={15}
                              className="mt-0.5 shrink-0 text-slate-400"
                            />

                            <div>
                              {customer.city && (
                                <p>{customer.city}</p>
                              )}

                              {customer.province && (
                                <p className="text-xs text-slate-400">
                                  {customer.province}
                                </p>
                              )}

                              {!customer.city && !customer.province && (
                                <span className="text-slate-400">-</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          {customer.status === "ACTIVE" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              ACTIVE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                              INACTIVE
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(customer)}
                              className="
                                flex h-9 w-9 items-center justify-center
                                rounded-lg border border-slate-200
                                bg-white text-slate-600 transition
                                hover:border-blue-200 hover:bg-blue-50
                                hover:text-blue-600
                              "
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteCustomer(customer)}
                              disabled={deleting === customer.id}
                              className="
                                flex h-9 w-9 items-center justify-center
                                rounded-lg border border-slate-200
                                bg-white text-slate-600 transition
                                hover:border-red-200 hover:bg-red-50
                                hover:text-red-600
                                disabled:cursor-not-allowed disabled:opacity-50
                              "
                              title="Hapus"
                            >
                              {deleting === customer.id ? (
                                <Loader2
                                  size={16}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARD */}
              <div className="divide-y divide-slate-100 md:hidden">
                {filteredCustomers.map((customer) => (
                  <div key={customer.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {customer.customer_name}
                        </p>

                        <p className="mt-0.5 text-xs font-medium text-blue-600">
                          {customer.customer_code}
                        </p>
                      </div>

                      {customer.status === "ACTIVE" ? (
                        <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          ACTIVE
                        </span>
                      ) : (
                        <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                          INACTIVE
                        </span>
                      )}
                    </div>

                    <div className="mt-3 space-y-2">
                      {customer.contact_person && (
                        <p className="text-sm text-slate-700">
                          {customer.contact_person}
                        </p>
                      )}

                      {customer.phone && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Phone size={14} />
                          {customer.phone}
                        </div>
                      )}

                      {customer.email && (
                        <div className="flex items-center gap-2 break-all text-xs text-slate-500">
                          <Mail size={14} />
                          {customer.email}
                        </div>
                      )}

                      {(customer.city || customer.province) && (
                        <div className="flex items-start gap-2 text-xs text-slate-500">
                          <MapPin size={14} className="mt-0.5 shrink-0" />

                          <span>
                            {[customer.city, customer.province]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(customer)}
                        className="
                          flex flex-1 items-center justify-center gap-2
                          rounded-lg border border-slate-200
                          bg-white py-2 text-xs font-semibold
                          text-slate-700 transition
                          hover:bg-slate-50
                        "
                      >
                        <Pencil size={14} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteCustomer(customer)}
                        disabled={deleting === customer.id}
                        className="
                          flex flex-1 items-center justify-center gap-2
                          rounded-lg border border-red-100
                          bg-red-50 py-2 text-xs font-semibold
                          text-red-600 transition
                          hover:bg-red-100
                          disabled:cursor-not-allowed disabled:opacity-50
                        "
                      >
                        {deleting === customer.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingCustomer
                    ? "Edit Customer"
                    : "Tambah Customer"}
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Lengkapi informasi customer di bawah ini
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="
                  flex h-9 w-9 items-center justify-center
                  rounded-full text-slate-400 transition
                  hover:bg-slate-100 hover:text-slate-700
                  disabled:cursor-not-allowed disabled:opacity-50
                "
              >
                <X size={20} />
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="overflow-y-auto px-5 py-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* CUSTOMER CODE */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Customer Code <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="text"
                    value={form.customer_code}
                    onChange={(e) =>
                      updateForm("customer_code", e.target.value)
                    }
                    placeholder="Contoh: CUST001"
                    disabled={!!editingCustomer || saving}
                    className="
                      h-10 w-full rounded-xl border border-slate-200
                      bg-white px-3 text-sm uppercase text-slate-900
                      outline-none transition
                      placeholder:normal-case placeholder:text-slate-400
                      focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                      disabled:bg-slate-100 disabled:text-slate-500
                    "
                  />

                  {editingCustomer && (
                    <p className="mt-1 text-[11px] text-slate-400">
                      Customer Code tidak dapat diubah.
                    </p>
                  )}
                </div>

                {/* CUSTOMER NAME */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Customer Name <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="text"
                    value={form.customer_name}
                    onChange={(e) =>
                      updateForm("customer_name", e.target.value)
                    }
                    placeholder="Nama customer"
                    disabled={saving}
                    className="
                      h-10 w-full rounded-xl border border-slate-200
                      bg-white px-3 text-sm text-slate-900
                      outline-none transition
                      placeholder:text-slate-400
                      focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                    "
                  />
                </div>

                {/* CONTACT PERSON */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Contact Person
                  </label>

                  <input
                    type="text"
                    value={form.contact_person}
                    onChange={(e) =>
                      updateForm("contact_person", e.target.value)
                    }
                    placeholder="Nama PIC"
                    disabled={saving}
                    className="
                      h-10 w-full rounded-xl border border-slate-200
                      bg-white px-3 text-sm text-slate-900
                      outline-none transition
                      placeholder:text-slate-400
                      focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                    "
                  />
                </div>

                {/* PHONE */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Phone
                  </label>

                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) =>
                      updateForm("phone", e.target.value)
                    }
                    placeholder="08xxxxxxxxxx"
                    disabled={saving}
                    className="
                      h-10 w-full rounded-xl border border-slate-200
                      bg-white px-3 text-sm text-slate-900
                      outline-none transition
                      placeholder:text-slate-400
                      focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                    "
                  />
                </div>

                {/* EMAIL */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Email
                  </label>

                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      updateForm("email", e.target.value)
                    }
                    placeholder="customer@email.com"
                    disabled={saving}
                    className="
                      h-10 w-full rounded-xl border border-slate-200
                      bg-white px-3 text-sm text-slate-900
                      outline-none transition
                      placeholder:text-slate-400
                      focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                    "
                  />
                </div>

                {/* STATUS */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Status
                  </label>

                  <select
                    value={form.status}
                    onChange={(e) =>
                      updateForm(
                        "status",
                        e.target.value as CustomerStatus
                      )
                    }
                    disabled={saving}
                    className="
                      h-10 w-full rounded-xl border border-slate-200
                      bg-white px-3 text-sm text-slate-900
                      outline-none transition
                      focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                    "
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                {/* ADDRESS */}
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Address
                  </label>

                  <textarea
                    value={form.address}
                    onChange={(e) =>
                      updateForm("address", e.target.value)
                    }
                    placeholder="Alamat lengkap customer"
                    rows={3}
                    disabled={saving}
                    className="
                      w-full resize-none rounded-xl border border-slate-200
                      bg-white px-3 py-2.5 text-sm text-slate-900
                      outline-none transition
                      placeholder:text-slate-400
                      focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                    "
                  />
                </div>

                {/* CITY */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    City
                  </label>

                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) =>
                      updateForm("city", e.target.value)
                    }
                    placeholder="Kota"
                    disabled={saving}
                    className="
                      h-10 w-full rounded-xl border border-slate-200
                      bg-white px-3 text-sm text-slate-900
                      outline-none transition
                      placeholder:text-slate-400
                      focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                    "
                  />
                </div>

                {/* PROVINCE */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Province
                  </label>

                  <input
                    type="text"
                    value={form.province}
                    onChange={(e) =>
                      updateForm("province", e.target.value)
                    }
                    placeholder="Provinsi"
                    disabled={saving}
                    className="
                      h-10 w-full rounded-xl border border-slate-200
                      bg-white px-3 text-sm text-slate-900
                      outline-none transition
                      placeholder:text-slate-400
                      focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                    "
                  />
                </div>

                {/* NOTES */}
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Notes
                  </label>

                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      updateForm("notes", e.target.value)
                    }
                    placeholder="Catatan tambahan..."
                    rows={3}
                    disabled={saving}
                    className="
                      w-full resize-none rounded-xl border border-slate-200
                      bg-white px-3 py-2.5 text-sm text-slate-900
                      outline-none transition
                      placeholder:text-slate-400
                      focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                    "
                  />
                </div>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="
                  flex h-10 items-center justify-center gap-2
                  rounded-xl border border-slate-200
                  bg-white px-4 text-sm font-semibold text-slate-700
                  transition hover:bg-slate-100
                  disabled:cursor-not-allowed disabled:opacity-50
                "
              >
                <X size={17} />
                Batal
              </button>

              <button
                type="button"
                onClick={saveCustomer}
                disabled={saving}
                className="
                  flex h-10 items-center justify-center gap-2
                  rounded-xl bg-blue-600 px-5
                  text-sm font-semibold text-white
                  shadow-sm transition hover:bg-blue-700
                  disabled:cursor-not-allowed disabled:opacity-60
                "
              >
                {saving ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save size={17} />
                    {editingCustomer ? "Update" : "Simpan"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}