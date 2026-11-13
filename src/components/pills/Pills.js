import React from 'react';
import { Tab, Nav } from 'react-bootstrap';
import PropTypes from 'prop-types';
import "./pills.css";

const Pills = ({ tabs, activeTab, onTabSelect, isLinedPills, marginBottom = 'mb24' }) => {

    return (
        <div className={ isLinedPills ? 'lined-pills' : 'common-pills' }>
            <Tab.Container id="pills-tab" activeKey={ activeTab } onSelect={ onTabSelect }>
                <div className={ `${ marginBottom } scroll-bar` }>
                    <Nav variant="pills" className='d-flex'>
                        { tabs?.map((tab, index) => (
                            <Nav.Item className={ isLinedPills ? 'nav-item-lines flex-fill' : 'flex-fill' } key={ tab.eventKey }>
                                <Nav.Link disabled={ (tab?.disabled !== undefined && tab?.disabled) ? tab?.disabled : false }
                                    className={ isLinedPills ? `nav-link-lines ${ index === 0 ? 'first-tab' : '' }` : '' }
                                    eventKey={ tab.eventKey }>
                                    { tab.title }
                                    { tab.notificationCount > 0 && (
                                        <span className="notification-badge">{ tab.notificationCount }</span>
                                    ) }
                                </Nav.Link>
                            </Nav.Item>
                        )) }
                    </Nav>
                </div>
                <Tab.Content>
                    { tabs.map((tab) => (
                        <Tab.Pane eventKey={ tab.eventKey } key={ tab.eventKey }>
                            { typeof tab.content === 'function' ? tab.content(onTabSelect, tabs) : tab.content }
                        </Tab.Pane>
                    )) }
                </Tab.Content>
            </Tab.Container >
        </div >
    );
};

Pills.propTypes = {
    tabs: PropTypes.arrayOf(
        PropTypes.shape({
            eventKey: PropTypes.string.isRequired,
            title: PropTypes.node.isRequired,
            content: PropTypes.oneOfType([
                PropTypes.node,
                PropTypes.func
            ]),
            notificationCount: PropTypes.number,
        })
    ).isRequired,
    activeTab: PropTypes.string,
    onTabSelect: PropTypes.func,
    isLinedPills: PropTypes.bool,
    marginBottom: PropTypes.string,
};

export default Pills;
