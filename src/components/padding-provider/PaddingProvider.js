import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import { toggleDensePadding } from '../../redux/Slices/common/CommonSlice';

export const PaddingProvider = ({ children }) => {
  const {isDensePadding} = useSelector(state => state.common);
  
  useEffect(() => {
    const rootElement = document.getElementById('root');
    if (isDensePadding) {
      rootElement.classList.add('dense-padding');
    } else {
      rootElement.classList.remove('dense-padding');
    }
  }, [isDensePadding]);

  return children;
};

PaddingProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const usePadding = () => {
  const {isDensePadding} = useSelector(state => state.common);
  const dispatch = useDispatch();
  
  const togglePadding = () => {
    dispatch(toggleDensePadding());
  };
  
  return { 
    isDensePadding, 
    toggleDensePadding: togglePadding 
  };
};