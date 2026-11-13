import React, { useState } from 'react';
import { Tab, Nav } from 'react-bootstrap';
import PropTypes from 'prop-types';
import "./tabs.css";

const Tabs = ({ tabs, onSelect, activeKeyTab }) => {
    const [activeKey, setActiveKey] = useState(activeKeyTab ? activeKeyTab : tabs.length > 0 ? tabs[0].eventKey : '');
    const handleSelect = (k) => {
        const selectedTab = tabs.find(tab => tab.eventKey === k);
        if (selectedTab?.disabledClass === 'disabled') {
            return;
        }
        setActiveKey(k);
        if (onSelect) {
            onSelect(k);
        }
    };

    const getItemColor = (status) => {
        switch (status) {
            case 'incomplete':
                return 'red-fill flex-fill';
            case 'not_ready':
                return 'red-fill flex-fill';
            case 'in-review':
                return 'blue-fill flex-fill';
            case 'blue':
            return 'blue-fill flex-fill';
            case 'action-required':
                return 'purple-fill flex-fill';
            case 'approved':
                return 'green-fill flex-fill';
            case 'ready':
                return 'green-fill flex-fill';
            default:
                return 'red-fill flex-fill';
        }
    }

    return (
        <Tab.Container activeKey={ activeKey } onSelect={ handleSelect }>
            <Nav variant="tabs" className='custom-tabs border-0 mb-3'>
                { tabs.map((tab) => (
                    <Nav.Item
                        key={ tab.eventKey }
                        className={ `${ getItemColor(tab?.status) } ${ tab?.disabledClass } ${ tab?.status && 'white-btns' } ${ activeKey === tab.eventKey ? 'active' : '' } ` }
                    >
                        <Nav.Link
                            className='text-left'
                            eventKey={ tab.eventKey }
                            disabled={ tab?.disabledClass === 'disabled' }
                        >
                            { tab.title }
                        </Nav.Link>
                    </Nav.Item>
                )) }
            </Nav>
            <Tab.Content>
                { tabs.map((tab) => (
                    <Tab.Pane key={ tab.eventKey } eventKey={ tab.eventKey }>
                        { tab.content }
                    </Tab.Pane>
                )) }
            </Tab.Content>
        </Tab.Container>
    );
};

Tabs.propTypes = {
    tabs: PropTypes.arrayOf(
        PropTypes.shape({
            eventKey: PropTypes.string.isRequired,
            title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
            content: PropTypes.node,
            disabledClass: PropTypes.string,
            status: PropTypes.string,
        })
    ).isRequired,
    onSelect: PropTypes.func,
    activeKeyTab: PropTypes.string,
};

export default Tabs;
