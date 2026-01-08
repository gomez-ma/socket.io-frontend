import { useEffect, useState } from 'react';
import axios from 'axios';
import { socket } from './socket';

interface Item {
  id: number;
  name: string;
  created_at?: string;
}

const API_URL = 'http://localhost:4000/items';

function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  /* Load list (ครั้งแรกเท่านั้น) */
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await axios.get<Item[]>(API_URL);
        setItems(res.data);
      } catch (err) {
        console.error('Fetch items error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  /* Socket events */
  useEffect(() => {
    const onCreated = (item: Item) => {
      setItems(prev => {
        if (prev.some(i => i.id === item.id)) return prev;
        return [item, ...prev];
      });
    };

    const onUpdated = (item: Item) => {
      setItems(prev =>
        prev.map(i => (i.id === item.id ? item : i))
      );
    };

    const onDeleted = ({ id }: { id: number }) => {
      setItems(prev => prev.filter(i => i.id !== id));
    };

    socket.on('item_created', onCreated);
    socket.on('item_updated', onUpdated);
    socket.on('item_deleted', onDeleted);

    return () => {
      socket.off('item_created', onCreated);
      socket.off('item_updated', onUpdated);
      socket.off('item_deleted', onDeleted);
    };
  }, []);

  /* Create / Update */
  const submitItem = async () => {
    if (!name.trim()) return;

    if (editingId === null) {
      await axios.post(API_URL, { name });
    } else {
      await axios.put(`${API_URL}/${editingId}`, { name });
    }

    setName('');
    setEditingId(null);
  };

  /* Edit */
  const startEdit = (item: Item) => {
    setEditingId(item.id);
    setName(item.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
  };

  /* Delete */
  const deleteItem = async (id: number) => {
    if (!window.confirm('Delete this item?')) return;
    await axios.delete(`${API_URL}/${id}`);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Real-time Items</h2>

      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Item name"
      />

      <button onClick={submitItem}>
        {editingId === null ? 'Add' : 'Update'}
      </button>

      {editingId !== null && (
        <button onClick={cancelEdit} style={{ marginLeft: 8 }}>
          Cancel
        </button>
      )}

      <hr />

      {loading ? (
        <p>Loading items...</p>
      ) : items.length === 0 ? (
        <p>No items</p>
      ) : (
        <ul>
          {items.map(item => (
            <li key={item.id}>
              {item.name}

              <button
                onClick={() => startEdit(item)}
                style={{ marginLeft: 8 }}
              >
                Edit
              </button>

              <button
                onClick={() => deleteItem(item.id)}
                style={{ marginLeft: 8 }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
