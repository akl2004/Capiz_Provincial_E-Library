import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import AxiosInstance from "../../../AxiosInstance";
import LoadingSpinner from "../../LoadingSpinner";

import provinceListData from "../../../data/ph_addresses/province.json";
import cityListData from "../../../data/ph_addresses/city.json";
import barangayListData from "../../../data/ph_addresses/barangay.json";

const provinceList = provinceListData as Province[];
const cityList = cityListData as City[];
const barangayList = barangayListData as Barangay[];

interface Province {
  province_code: string;
  province_name: string;
  region_code: string;
}

interface City {
  city_code: string;
  city_name: string;
  province_code: string;
}

interface Barangay {
  brgy_code: string;
  brgy_name: string;
  city_code: string;
  province_code: string;
}

interface Patron {
  patron_id?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  email: string;
  province?: string;
  city?: string;
  barangay?: string;
  number?: string;
  status?: string;
  age?: number;
  gender?: string;
  notes?: string;
  created_at?: string;
  expiry_date?: string;
}

const EditPatron = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patron, setPatron] = useState<Patron | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false); // for Save button

  const [provinceSuggestions, setProvinceSuggestions] = useState<Province[]>(
    []
  );
  const [citySuggestions, setCitySuggestions] = useState<City[]>([]);
  const [barangaySuggestions, setBarangaySuggestions] = useState<Barangay[]>(
    []
  );

  useEffect(() => {
    document.title = "Edit Patron";
    if (!id) return;

    setLoading(true);
    AxiosInstance.get(`/patrons/${id}`)
      .then((res) => setPatron(res.data))
      .catch((err) => console.error("Failed to fetch patron info", err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!patron) return;
    const { name, value } = e.target;
    setPatron({ ...patron, [name]: value });
  };

  const handleProvinceChange = (value: string) => {
    if (!patron) return;
    setPatron({ ...patron, province: value });
    setProvinceSuggestions(
      provinceList
        .filter((p) =>
          p.province_name.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 4)
    );
  };

  const handleCityChange = (value: string) => {
    if (!patron) return;
    setPatron({ ...patron, city: value });

    const provinceName = patron.province?.toLowerCase() || "";
    const selectedProvince = provinceList.find(
      (p) => p.province_name.toLowerCase() === provinceName
    );
    if (!selectedProvince) return setCitySuggestions([]);

    setCitySuggestions(
      cityList
        .filter(
          (c) =>
            c.province_code === selectedProvince.province_code &&
            c.city_name.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 4)
    );
  };

  const handleBarangayChange = (value: string) => {
    if (!patron) return;
    setPatron({ ...patron, barangay: value });

    const cityName = patron.city?.toLowerCase() || "";
    const selectedCity = cityList.find(
      (c) => c.city_name.toLowerCase() === cityName
    );
    if (!selectedCity) return setBarangaySuggestions([]);

    setBarangaySuggestions(
      barangayList
        .filter(
          (b) =>
            b.city_code === selectedCity.city_code &&
            b.brgy_name.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 4)
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!patron || !id) return;

    setSaving(true); // only affect the button
    try {
      await AxiosInstance.put(`/patrons/${id}`, patron);
      alert("Patron info updated successfully!");
      navigate(-1);
    } catch (error) {
      console.error("Error updating patron:", error);
      alert("Failed to update patron record. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!patron) return <p>Patron not found.</p>;

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toISOString().split("T")[0];
  };

  const fullName = [
    patron.first_name,
    patron.middle_name,
    patron.last_name,
    patron.suffix,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="py-2 px-4 mb-4 bg-gray-200 hover:bg-gray-300 rounded"
      >
        ← Back
      </button>

      <div className="patron-container">
        <div className="patron-record">
          <h1 className="text-xl font-semibold mb-0">Patron Record</h1>
          <p className="mb-6 text-gray-600">
            <i>Holds the recorded information of the patron</i>
          </p>

          <form onSubmit={handleSubmit}>
            <table className="mb-4">
              <tbody>
                <tr>
                  <td className="key font-medium pr-4">Patron ID</td>
                  <td className="value">{patron.patron_id || "-"}</td>
                </tr>

                <tr>
                  <td className="key font-medium pr-4">Name</td>
                  <td className="value">{fullName}</td>
                </tr>

                <tr>
                  <td className="key font-medium pr-4">Age</td>
                  <td className="value">
                    <input
                      type="text"
                      name="age"
                      value={patron.age ?? ""}
                      onChange={handleChange}
                    />
                  </td>
                </tr>

                <tr>
                  <td className="key font-medium pr-4">Address</td>
                  <td className="value flex gap-2">
                    <div className="address-row">
                      <div className="input-wrapper">
                        <input
                          type="text"
                          placeholder="Province"
                          value={patron.province || ""}
                          onChange={(e) => handleProvinceChange(e.target.value)}
                        />
                        {provinceSuggestions.length > 0 && (
                          <ul className="suggestion-lists">
                            {provinceSuggestions.map((p) => (
                              <li
                                key={p.province_code}
                                onClick={() => {
                                  handleProvinceChange(p.province_name);
                                  setProvinceSuggestions([]);
                                }}
                                className="suggestion-item"
                              >
                                {p.province_name}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="input-wrapper">
                        <input
                          type="text"
                          placeholder="City"
                          value={patron.city || ""}
                          onChange={(e) => handleCityChange(e.target.value)}
                        />
                        {citySuggestions.length > 0 && (
                          <ul className="suggestion-lists">
                            {citySuggestions.map((c) => (
                              <li
                                key={c.city_code}
                                onClick={() => {
                                  handleCityChange(c.city_name);
                                  setCitySuggestions([]);
                                }}
                                className="suggestion-item"
                              >
                                {c.city_name}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="input-wrapper">
                        <input
                          type="text"
                          placeholder="Barangay"
                          value={patron.barangay || ""}
                          onChange={(e) => handleBarangayChange(e.target.value)}
                        />
                        {barangaySuggestions.length > 0 && (
                          <ul className="suggestion-lists">
                            {barangaySuggestions.map((b) => (
                              <li
                                key={b.brgy_code}
                                onClick={() => {
                                  handleBarangayChange(b.brgy_name);
                                  setBarangaySuggestions([]);
                                }}
                                className="suggestion-item"
                              >
                                {b.brgy_name}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="key font-medium pr-4">Gender</td>
                  <td className="value">{patron.gender ?? "-"}</td>
                </tr>

                <tr>
                  <td className="key font-medium pr-4">Number</td>
                  <td className="value">
                    <input
                      type="text"
                      name="number"
                      value={patron.number || ""}
                      onChange={handleChange}
                    />
                  </td>
                </tr>

                <tr>
                  <td className="key font-medium pr-4">Email</td>
                  <td className="value">
                    <input
                      type="email"
                      name="email"
                      value={patron.email}
                      onChange={handleChange}
                    />
                  </td>
                </tr>

                <tr>
                  <td className="key font-medium pr-4">Status</td>
                  <td className="value">{patron.status || "-"}</td>
                </tr>

                <tr>
                  <td className="key font-medium pr-4">Registration Date</td>
                  <td className="value">{formatDate(patron.created_at)}</td>
                </tr>

                <tr>
                  <td className="key font-medium pr-4">Expiry Date</td>
                  <td className="value">{formatDate(patron.expiry_date)}</td>
                </tr>

                <tr>
                  <td className="key font-medium pr-4">Notes</td>
                  <td className="value">
                    <input
                      type="text"
                      name="notes"
                      value={patron.notes || ""}
                      onChange={handleChange}
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="form-actions">
              <button type="submit" className="submit-btn" disabled={saving}>
                {saving && <span className="spinner-tiny"></span>}
                <span>{saving ? "Saving..." : "Save Patron"}</span>
              </button>

              <button
                type="button"
                className="cancel-btn"
                onClick={() => navigate(-1)}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditPatron;
