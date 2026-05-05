import { useEffect, useState } from "react";
import { api, formatError } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Edit, Trash2, X, Upload, Image } from "lucide-react";

const emptyItem = {
  name: "",
  description: "",
  price: 0,
  category: "",
  image: "",
  available: true,
};

const emptyCategory = {
  name: "",
  description: "",
};

export default function AdminMenu() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | item
  const [editingCategory, setEditingCategory] = useState(null); // null | 'new' | category
  const [form, setForm] = useState(emptyItem);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  const load = async () => {
    try {
      const [itemsRes, categoriesRes] = await Promise.all([
        api.get("/admin/menu"),
        api.get("/admin/categories"),
      ]);
      setItems(itemsRes.data);
      setCategories(categoriesRes.data);
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Category management
  const openNewCategory = () => {
    setCategoryForm(emptyCategory);
    setEditingCategory("new");
  };

  const openEditCategory = (cat) => {
    setCategoryForm({ ...cat, id: cat._id || cat.id });
    setEditingCategory(cat);
  };

  const saveCategory = async () => {
    try {
      if (editingCategory === "new") {
        await api.post("/admin/categories", categoryForm);
        toast.success("Category created");
      } else {
        await api.patch(`/admin/categories/${editingCategory._id || editingCategory.id}`, categoryForm);
        toast.success("Category updated");
      }
      setEditingCategory(null);
      load();
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  const removeCategory = async (id) => {
    if (!window.confirm("Delete this category? Items using it will lose the category.")) return;
    try {
      await api.delete(`/admin/categories/${id}`);
      toast.success("Category deleted");
      load();
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  // Menu item management

  const openNew = () => {
    setForm(emptyItem);
    setImagePreview(null);
    setImageFile(null);
    setEditing("new");
  };

  const openEdit = (it) => {
    // normalize id into `_id` aware form for editor
    setForm({ ...it, id: it._id || it.id });
    setImagePreview(it.image || null);
    setImageFile(null);
    setEditing(it);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (1 MB = 1048576 bytes)
    const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File size must be less than 1 MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`);
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result);
    };
    reader.readAsDataURL(file);

    // Store file for upload when saving
    setImageFile(file);
    toast.info('Image selected. It will be uploaded when you save.');
  };

  const save = async () => {
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price) || 0,
      };
      
      let savedItemId = null;
      
      if (editing === "new") {
        const res = await api.post("/admin/menu", payload);
        savedItemId = res.data._id || res.data.id;
        toast.success("Menu item created");
      } else {
        await api.patch(`/admin/menu/${editing._id || editing.id || form.id}`, payload);
        savedItemId = editing._id || editing.id || form.id;
        toast.success("Updated");
      }

      // Upload image if file is selected
      if (imageFile && savedItemId) {
        try {
          setUploading(true);
          const formData = new FormData();
          formData.append('image', imageFile);
          
          const res = await api.post(`/admin/menu/${savedItemId}/image`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          
          toast.success('Image uploaded to Cloudinary!');
          setImageFile(null);
        } catch (err) {
          toast.error('Image upload failed: ' + formatError(err));
        } finally {
          setUploading(false);
        }
      }

      setEditing(null);
      setImagePreview(null);
      setImageFile(null);
      load();
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await api.delete(`/admin/menu/${id}`);
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  return (
    <div className="p-8" data-testid="admin-menu">
      {/* CATEGORIES SECTION */}
      <div className="mb-10">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl font-semibold">Categories</h2>
            <p className="text-sm text-[#5c5656] mt-1">Organize your menu with categories.</p>
          </div>
          <button
            onClick={openNewCategory}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2a2626] text-white text-sm hover:bg-[#c84b31]"
          >
            <Plus size={16} /> New category
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-[#5c5656]">Loading...</div>
        ) : (
          <div className="bg-white rounded-xl border border-[#eae6df] overflow-hidden">
            {categories.length === 0 ? (
              <div className="p-4 text-sm text-[#5c5656]">No categories yet. Create one above.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-[#f4f3ef] text-[#5c5656]">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Name</th>
                    <th className="text-left px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr
                      key={cat._id || cat.id}
                      className="border-t border-[#eae6df]"
                    >
                      <td className="px-4 py-3 font-medium">{cat.name}</td>
                      <td className="px-4 py-3 text-xs text-[#5c5656]">{cat.description || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEditCategory(cat)}
                          className="p-2 rounded hover:bg-[#f4f3ef]"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => removeCategory(cat._id || cat.id)}
                          className="p-2 rounded hover:bg-[#f4f3ef] text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* MENU ITEMS SECTION */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Menu</h1>
          <p className="text-sm text-[#5c5656] mt-1">All dishes available to your diners.</p>
        </div>
        <button
          data-testid="add-menu-item-btn"
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2a2626] text-white text-sm hover:bg-[#c84b31]"
        >
          <Plus size={16} /> New item
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-[#5c5656]">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-[#eae6df] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#f4f3ef] text-[#5c5656]">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-left px-4 py-3 font-medium">Price</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr
                  key={it._id || it.id}
                  data-testid={`menu-row-${it._id || it.id}`}
                  className="border-t border-[#eae6df]"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{it.name}</div>
                    <div className="text-xs text-[#5c5656] truncate max-w-xs">
                      {it.description}
                    </div>
                  </td>
                  <td className="px-4 py-3">{it.category?.name || it.category || ''}</td>
                  <td className="px-4 py-3">₹{Number(it.price || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        it.available
                          ? "bg-[#2d4221]/10 text-[#2d4221]"
                          : "bg-[#5c5656]/10 text-[#5c5656]"
                      }`}
                    >
                      {it.available ? "available" : "hidden"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      data-testid={`edit-menu-${it._id || it.id}`}
                      onClick={() => openEdit(it)}
                      className="p-2 rounded hover:bg-[#f4f3ef]"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      data-testid={`delete-menu-${it._id || it.id}`}
                      onClick={() => remove(it._id || it.id)}
                      className="p-2 rounded hover:bg-[#f4f3ef] text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
            data-testid="menu-editor-modal"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-xl font-semibold">
                {editing === "new" ? "New menu item" : "Edit menu item"}
              </h3>
              <button onClick={() => setEditing(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <Field label="Name">
                <input
                  data-testid="form-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Description">
                <textarea
                  data-testid="form-description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input min-h-[80px]"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Price (₹)">
                  <input
                    data-testid="form-price"
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="Category">
                  <select
                    data-testid="form-category"
                    value={form.category?._id || form.category || ""}
                    onChange={(e) => {
                      const selected = categories.find(c => c._id === e.target.value);
                      setForm({ ...form, category: selected || e.target.value });
                    }}
                    className="input"
                  >
                    <option value="">No category</option>
                    {categories.map((c) => (
                      <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Image">
                <div className="space-y-2">
                  {imagePreview && (
                    <div className="relative w-20 h-20 bg-[#f4f3ef] rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <Image size={16} className="text-white" />
                      </div>
                    </div>
                  )}
                  <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[#eae6df] rounded-lg cursor-pointer hover:border-[#c84b31] hover:bg-[#f9f8f6] transition">
                    <Upload size={16} className="text-[#c84b31]" />
                    <span className="text-sm text-[#5c5656]">
                      {uploading ? "Uploading..." : "Upload image"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setImageFile(null);
                      }}
                      className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  data-testid="form-available"
                  type="checkbox"
                  checked={form.available}
                  onChange={(e) => setForm({ ...form, available: e.target.checked })}
                />
                Available to diners
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-lg border border-[#eae6df] text-sm"
              >
                Cancel
              </button>
              <button
                data-testid="form-save-btn"
                onClick={save}
                className="px-4 py-2 rounded-lg bg-[#2a2626] text-white text-sm hover:bg-[#c84b31]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {editingCategory && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditingCategory(null)}>
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-xl font-semibold">
                {editingCategory === "new" ? "New category" : "Edit category"}
              </h3>
              <button onClick={() => setEditingCategory(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <Field label="Category Name">
                <input
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="input"
                  placeholder="e.g., Starters, Main Courses"
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="input min-h-[80px]"
                  placeholder="Optional description"
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingCategory(null)}
                className="px-4 py-2 rounded-lg border border-[#eae6df] text-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveCategory}
                className="px-4 py-2 rounded-lg bg-[#2a2626] text-white text-sm hover:bg-[#c84b31]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .input {
          width: 100%;
          padding: 0.6rem 0.85rem;
          border-radius: 0.6rem;
          border: 1px solid #eae6df;
          background: white;
          font-size: 0.9rem;
        }
        .input:focus {
          outline: none;
          border-color: #c84b31;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-[#5c5656]">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
