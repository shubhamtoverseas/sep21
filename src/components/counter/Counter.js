import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

import "./counter.css";

const Counter = ({ onIncreaseDecrease, counterCount = 0, maxCount }) => {
    const [count, setCount] = useState(counterCount);

    useEffect(() => {
        setCount(counterCount);
    }, [counterCount]);

    const handleIncrement = (e) => {
        e.preventDefault();
        if (maxCount && count >= maxCount) {
            setCount(count);
            onIncreaseDecrease(count);
        } else {
            const newCount = count + 1;
            setCount(newCount);
            onIncreaseDecrease(newCount);
        }
    };

    const handleDecrement = (e) => {
        e.preventDefault();
        if (count > 0) {
            const newCount = count - 1;
            setCount(newCount);
            onIncreaseDecrease(newCount);
        }
    };


    return (
        <div className="counter">
            <Link
                className="minus-circle-btn mr-2"
                onClick={handleDecrement}
                disabled={count === 0}
            >
                <i className="ri-subtract-line grey2"></i>
            </Link>
            <span className="position-relative fz16 fw-400" style={{ top: '-2px' }}>{count}</span>
            <Link className="plus-circle-btn ml-2" onClick={handleIncrement}>
                <i className="ri-add-line grey2"></i>
            </Link>
        </div>
    );
};

Counter.propTypes = {
    onIncreaseDecrease: PropTypes.func,
    count: PropTypes.func,
    counterCount: PropTypes.number,
    maxCount: PropTypes.number,
};

export default Counter;
