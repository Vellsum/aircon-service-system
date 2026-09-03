import { useEffect, useState } from 'react';

function Connector() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch data from your backend API
    fetch('http://localhost:5000/api/users')
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load data');
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading database records...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>Data from Azure SQL Database</h1>
      
      {items.length === 0 ? (
        <p>No records found in database.</p>
      ) : (
        <ul>
          {items.map((item, index) => (
            // Replace 'id' and 'name' with actual column names from your SQL table
            <li key={item.id || index}>
              {JSON.stringify(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Connector;