import React, { useState } from 'react'; // Import useState for state management

const SelectableImage = ({ src, width, onClick, isSelected, isDisabled }) => {
  const [selected, setSelected] = useState(isSelected || false); // Initialize selected state based on props or default to false

  const handleClick = () => {
    if (!isDisabled) {
      setSelected(!selected);
      onClick && onClick(!selected); // Call provided onClick with updated selection state
    }
  };

  return (
    <img src={src}
      className={`selectable-image ${selected ? 'selected' : ''}`}
      style={{
        width,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        backgroundColor: 'white',
        boxShadow: '0 0 10px rgba(0,0,0,0.5)',
        transform: selected ? 'translateY(-5px)' : 'translateY(0)', // Apply elevation on selection
        transition: 'transform 0.2s ease-in-out', // Smooth elevation transition
       borderRadius: '5%', 
      }}
      onClick={handleClick}
    />
     
    
  );
};

export default SelectableImage;
